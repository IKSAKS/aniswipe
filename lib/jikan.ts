import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { db } from "./db";

export interface AnimeImage {
	jpg: { image_url: string; large_image_url: string };
}
export interface Anime {
	mal_id: number;
	title: string;
	synopsis?: string | null;
	zanrss?: { vards: string; mal_id?: number }[];
	images: AnimeImage;
	searchZanri?: number[];
	votes?: number;
}

const lietotajsCache = new Map<number, any>();
let allZanri: { mal_id: number; vards: string }[] = [];
let zanrssLoaded = false;

let lastRequestTime = 0;
const MIN_DELAY = 400;

async function safeGet<T = any>(
	url: string,
	opts?: AxiosRequestConfig,
	attempt = 1,
): Promise<AxiosResponse<T>> {
	const now = Date.now();
	const diff = now - lastRequestTime;
	if (diff < MIN_DELAY)
		await new Promise((r) => setTimeout(r, MIN_DELAY - diff));
	try {
		const res = await axios.get<T>(url, opts);
		lastRequestTime = Date.now();
		return res;
	} catch (err: any) {
		const status = err?.response?.status;
		if (status === 429 && attempt < 4) {
			const retryHeader = err.response?.headers?.["retry-after"];
			const delay =
				((retryHeader ? parseFloat(retryHeader) : 2 * attempt) || 2) * 1000;
			console.warn(`429 rate limited – retry in ${delay / 1000}s`);
			await new Promise((r) => setTimeout(r, delay));
			return safeGet(url, opts, attempt + 1);
		}
		throw err;
	}
}

async function loadAllZanri(): Promise<void> {
	if (zanrssLoaded) return;
	const res = await safeGet("https://api.jikan.moe/v4/zanrss/anime", {
		params: { filter: "zanrss" },
	});
	const data: any[] = res.data?.data ?? [];
	allZanri = data.map((g) => ({ mal_id: g.mal_id, vards: g.vards.trim() }));
	zanrssLoaded = true;
	console.log("Loaded", allZanri.length, "zanrss");
}

function shuffle<T>(arr: T[]): T[] {
	const c = [...arr];
	for (let i = c.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[c[i], c[j]] = [c[j], c[i]];
	}
	return c;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function mapDbRowToAnime(row: any): Anime {
	return {
		mal_id: row.id,
		title: row.title,
		synopsis: row.synopsis ?? null,
		zanrss: (row.zanrss ?? []) as { vards: string; mal_id?: number }[],
		images: (row.images ?? {
			jpg: { image_url: "", large_image_url: "" },
		}) as AnimeImage,
	};
}

export async function panemtAnimeById(
	malId: number,
	forceRefresh = false,
): Promise<Anime | null> {
	const cached = await db.anime.findUnique({ where: { id: malId } });

	if (cached && !forceRefresh) {
		const age = Date.now() - new Date(cached.fetchedAt).getTime();
		if (age < ONE_DAY_MS) {
			return mapDbRowToAnime(cached);
		}
	}

	try {
		const res = await safeGet(`https://api.jikan.moe/v4/anime/${malId}`);
		if (!res?.data?.data) throw new Error("no data from jikan");
		const r = res.data.data;

		const animeObj: Anime = {
			mal_id: r.mal_id,
			title: r.title || r.title_english || r.title_japanese || "Untitled",
			synopsis: r.synopsis ?? null,
			zanrss: (r.zanrss ?? []).map((g: any) => ({
				vards: g.vards,
				mal_id: g.mal_id,
			})),
			images: {
				jpg: {
					image_url:
						r.images?.jpg?.image_url ||
						r.images?.webp?.image_url ||
						(r.image_url as string) ||
						"",
					large_image_url:
						r.images?.jpg?.large_image_url ||
						r.images?.webp?.large_image_url ||
						"",
				},
			},
			searchZanri: [],
			votes: r.votes ?? 0,
		};

		await db.anime.upsert({
			where: { id: animeObj.mal_id },
			update: {
				title: animeObj.title,
				synopsis: animeObj.synopsis,
				images: animeObj.images as any,
				zanrss: animeObj.zanrss as any,
				fetchedAt: new Date(),
			},
			create: {
				id: animeObj.mal_id,
				title: animeObj.title,
				synopsis: animeObj.synopsis,
				images: animeObj.images as any,
				zanrss: animeObj.zanrss as any,
				fetchedAt: new Date(),
			},
		});

		return animeObj;
	} catch (err) {
		console.warn("panemtAnimeById failed for", malId, err);
		if (cached) return mapDbRowToAnime(cached);
		return null;
	}
}

async function upsertAnimeCacheFromObject(a: Anime) {
	try {
		await db.anime.upsert({
			where: { id: a.mal_id },
			update: {
				title: a.title,
				synopsis: a.synopsis ?? null,
				images: a.images as any,
				zanrss: a.zanrss as any,
				fetchedAt: new Date(),
			},
			create: {
				id: a.mal_id,
				title: a.title,
				synopsis: a.synopsis ?? null,
				images: a.images as any,
				zanrss: a.zanrss as any,
				fetchedAt: new Date(),
			},
		});
	} catch (err) {
		console.warn("Failed to upsert anime cache", a.mal_id, err);
	}
}

/* ------------------------------
   Preference registration (unchanged)
   ------------------------------ */

export async function registerPreference(
	anime: Anime,
	patik: boolean,
	searchZanrsIds: number[] = [],
	lietotajsId: number,
) {
	await db.lietotajsAnime.upsert({
		where: {
			lietotajsId_animeId: {
				lietotajsId,
				animeId: anime.mal_id,
			},
		},
		update: {
			patik,
		},
		create: {
			lietotajsId,
			animeId: anime.mal_id,
			patik,
		},
	});

	await upsertAnimeCacheFromObject(anime);

	for (const g of anime.zanrss ?? []) {
		if (!g.mal_id) continue;

		const zanrs = await db.zanrs.upsert({
			where: { id: g.mal_id },
			update: {},
			create: {
				id: g.mal_id,
				vards: g.vards.trim(),
			},
		});

		const shouldBoost = patik && !searchZanrsIds.includes(g.mal_id);
		const delta = patik ? (shouldBoost ? 1 : 0) : -0.2;

		await db.lietotajsZanrs.upsert({
			where: {
				lietotajsId_zanrsId: {
					lietotajsId,
					zanrsId: zanrs.id,
				},
			},
			update: {
				smagums: {
					increment: delta,
				},
			},
			create: {
				lietotajsId,
				zanrsId: zanrs.id,
				smagums: patik ? 2 : 1,
			},
		});
	}
}

async function pickZanri(lietotajsId: number): Promise<number[]> {
	const lietotajsZanri = await db.lietotajsZanrs.findMany({
		where: {
			lietotajsId,
			smagums: { gte: 1 },
		},
		orderBy: {
			smagums: "desc",
		},
		take: 2,
		include: {
			zanrs: true,
		},
	});

	if (!lietotajsZanri.length) {
		await loadAllZanri();
		return shuffle(allZanri)
			.slice(0, 1)
			.map((g) => g.mal_id);
	}

	return lietotajsZanri.map((g: any) => g.zanrs.id);
}

const PERSONALISE_THRESHOLD = 5;

async function patikCount(lietotajsId: number): Promise<number> {
	const zanrss = await db.lietotajsAnime.findMany({
		where: {
			lietotajsId,
			patik: true,
		},
	});

	return zanrss.length;
}

const lietotajsRecommendationHistory = new Map<number, Set<number>>();

async function refillPool(lietotajsId: number): Promise<Anime[]> {
	const likes = await patikCount(lietotajsId);
	const usePersonalised = likes >= PERSONALISE_THRESHOLD;
	let res: AxiosResponse<any> | null = null;
	const gIds = usePersonalised ? await pickZanri(lietotajsId) : [];
	const recommendations = true;

	if (!usePersonalised) {
		res = await safeGet("https://api.jikan.moe/v4/top/anime", {
			params: {
				limit: 25,
				page: Math.floor(Math.random() * 5) + 1,
				sfw: true,
			},
		});
	} else {
		const recentPatik = await db.lietotajsAnime.findMany({
			where: {
				lietotajsId,
				patik: true,
			},
			orderBy: {
				izveidots: "desc",
			},
			take: 5,
		});

		const used =
			lietotajsRecommendationHistory.get(lietotajsId) ?? new Set<number>();
		const candidates = recentPatik.filter((a) => !used.has(a.animeId));

		const source =
			candidates.length > 0
				? candidates[Math.floor(Math.random() * candidates.length)]
				: recentPatik[Math.floor(Math.random() * recentPatik.length)];

		used.add(source.animeId);
		lietotajsRecommendationHistory.set(lietotajsId, used);

		res = await safeGet(
			"https://api.jikan.moe/v4/anime/" + source.animeId + "/recommendations",
		);
	}

	if (!res || !Array.isArray(res.data?.data)) return [];

	const valid = res.data.data
		.map((anime: any) => {
			const r = anime.entry ?? anime;
			return {
				mal_id: r.mal_id,
				title: r.title || r.title_english || r.title_japanese || "Untitled",
				synopsis: r.synopsis ?? "",
				zanrss: r.zanrss ?? [],
				images: {
					jpg: {
						image_url:
							r.images?.jpg?.image_url || r.images?.webp?.image_url || "",
						large_image_url:
							r.images?.jpg?.large_image_url ||
							r.images?.webp?.large_image_url ||
							"",
					},
				},
				searchZanri: usePersonalised || !recommendations ? gIds : [],
				votes: anime.votes ?? 0,
			} as Anime;
		})
		.filter(
			(a: Anime) =>
				a.mal_id &&
				a.title &&
				a.images.jpg.image_url &&
				(a.votes == 0 || (a.votes ?? 0) >= 5),
		)
		.sort((a: Anime, b: Anime) => (b.votes ?? 0) - (a.votes ?? 0))
		.slice(0, 10);

	console.log(
		usePersonalised ? `personalised (${valid.length} might like)` : "popular",
	);

	return valid;
}

async function takeFromPool(lietotajsId: number): Promise<Anime | null> {
	if (!lietotajsCache.has(lietotajsId)) {
		lietotajsCache.set(lietotajsId, { pool: [] });
	}

	const cache = lietotajsCache.get(lietotajsId)!;

	cache.pool = cache.pool.sort(
		(a: any, b: any) => (b.votes ?? 0) - (a.votes ?? 0),
	);

	while (cache.pool.length) {
		const pick = cache.pool.shift()!;
		const lietotajsAnime = await db.lietotajsAnime.findUnique({
			where: {
				lietotajsId_animeId: {
					lietotajsId,
					animeId: pick?.mal_id,
				},
			},
		});
		if (lietotajsAnime) {
			continue;
		}
		return pick;
	}

	const refill = await refillPool(lietotajsId);

	const seen = await db.lietotajsAnime.findMany({
		where: { lietotajsId },
		select: { animeId: true },
	});
	const seenIds = new Set(seen.map((s) => s.animeId));

	if (!refill.length) {
		console.warn("API failed – serving fallback popular");

		const fallback = await safeGet("https://api.jikan.moe/v4/top/anime", {
			params: { limit: 25, sfw: true },
		});
		if (!Array.isArray(fallback.data?.data)) return null;

		cache.pool = fallback.data.data
			.map((r: any) => ({
				mal_id: r.mal_id,
				title: r.title,
				synopsis: r.synopsis ?? "",
				zanrss: r.zanrss ?? [],
				images: {
					jpg: {
						image_url: r.images?.jpg?.image_url || "",
						large_image_url: r.images?.jpg?.large_image_url || "",
					},
				},
				searchZanri: [],
				votes: 0,
			}))
			.filter((a: Anime) => !seenIds.has(a.mal_id));
	} else {
		cache.pool = refill.filter((anime) => !seenIds.has(anime.mal_id));
	}

	return takeFromPool(lietotajsId);
}

export async function panemtRandomAnime(
	lietotajsId: number,
): Promise<number | null> {
	const pick = await takeFromPool(lietotajsId);
	return pick?.mal_id ?? null;
}

export async function panemtRandomAnimeFull(
	lietotajsId: number,
): Promise<Anime | null> {
	const malId = await panemtRandomAnime(lietotajsId);
	if (!malId) return null;
	return panemtAnimeById(malId);
}
