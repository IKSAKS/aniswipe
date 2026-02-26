import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { db } from "./db";

export interface AnimeImage {
	jpg: { image_url: string; large_image_url: string };
}
export interface Anime {
	mal_id: number;
	title: string;
	synopsis?: string | null;
	genres?: { name: string; mal_id?: number }[];
	images: AnimeImage;
	searchGenres?: number[];
	votes?: number;
}

const userCache = new Map<number, any>();
let allGenres: { mal_id: number; name: string }[] = [];
let genresLoaded = false;

let lastRequestTime = 0;
const MIN_DELAY = 400;

//funkcija ir prieks API pieprasījumiem uz Jikan, kas izvairās no rate limit kļūdas, ieviešot aizkavi un atkārtotus mēģinājumus pēc nepieciešamības.
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

async function loadAllGenres(): Promise<void> {
	if (genresLoaded) return;
	const res = await safeGet("https://api.jikan.moe/v4/genres/anime", {
		params: { filter: "genres" },
	});
	const data: any[] = res.data?.data ?? [];
	allGenres = data.map((g) => ({ mal_id: g.mal_id, name: g.name.trim() }));
	genresLoaded = true;
	console.log("Loaded", allGenres.length, "genres");
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
		genres: (row.genres ?? []) as { name: string; mal_id?: number }[],
		images: (row.images ?? {
			jpg: { image_url: "", large_image_url: "" },
		}) as AnimeImage,
	};
}

//šī funkcija atgriež anime no tā malId, vispirms mēģinot to atrast kešā datubāzē, un ja tas nav pieejams vai ir novecojis, tad iegūst to no Jikan API un atjaunina kešu.
export async function getAnimeById(
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
			genres: (r.genres ?? []).map((g: any) => ({
				name: g.name,
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
			searchGenres: [],
			votes: r.votes ?? 0,
		};

		await db.anime.upsert({
			where: { id: animeObj.mal_id },
			update: {
				title: animeObj.title,
				synopsis: animeObj.synopsis,
				images: animeObj.images as any,
				genres: animeObj.genres as any,
				fetchedAt: new Date(),
			},
			create: {
				id: animeObj.mal_id,
				title: animeObj.title,
				synopsis: animeObj.synopsis,
				images: animeObj.images as any,
				genres: animeObj.genres as any,
				fetchedAt: new Date(),
			},
		});

		return animeObj;
	} catch (err) {
		console.warn("getAnimeById failed for", malId, err);
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
				genres: a.genres as any,
				fetchedAt: new Date(),
			},
			create: {
				id: a.mal_id,
				title: a.title,
				synopsis: a.synopsis ?? null,
				images: a.images as any,
				genres: a.genres as any,
				fetchedAt: new Date(),
			},
		});
	} catch (err) {
		console.warn("Failed to upsert anime cache", a.mal_id, err);
	}
}

export async function registerPreference(
	anime: Anime,
	liked: boolean,
	searchGenreIds: number[] = [],
	userId: number,
) {
	await db.userAnime.upsert({
		where: {
			userId_animeId: {
				userId,
				animeId: anime.mal_id,
			},
		},
		update: {
			liked,
		},
		create: {
			userId,
			animeId: anime.mal_id,
			liked,
		},
	});

	await upsertAnimeCacheFromObject(anime);

	for (const g of anime.genres ?? []) {
		if (!g.mal_id) continue;

		const genre = await db.genre.upsert({
			where: { id: g.mal_id },
			update: {},
			create: {
				id: g.mal_id,
				name: g.name.trim(),
			},
		});

		const shouldBoost = liked && !searchGenreIds.includes(g.mal_id);
		const delta = liked ? (shouldBoost ? 1 : 0) : -0.2;

		await db.userGenre.upsert({
			where: {
				userId_genreId: {
					userId,
					genreId: genre.id,
				},
			},
			update: {
				weight: {
					increment: delta,
				},
			},
			create: {
				userId,
				genreId: genre.id,
				weight: liked ? 2 : 1,
			},
		});
	}
}

async function pickGenres(userId: number): Promise<number[]> {
	const userGenres = await db.userGenre.findMany({
		where: {
			userId,
			weight: { gte: 1 },
		},
		orderBy: {
			weight: "desc",
		},
		take: 2,
		include: {
			genre: true,
		},
	});

	if (!userGenres.length) {
		await loadAllGenres();
		return shuffle(allGenres)
			.slice(0, 1)
			.map((g) => g.mal_id);
	}

	return userGenres.map((g: any) => g.genre.id);
}

const PERSONALISE_THRESHOLD = 5;

async function likedCount(userId: number): Promise<number> {
	const genres = await db.userAnime.findMany({
		where: {
			userId,
			liked: true,
		},
	});

	return genres.length;
}

const userRecommendationHistory = new Map<number, Set<number>>();

//šī funkcija atbild par anime rekomendāciju loģiku, tai skaitā gan populāro anime piedāvāšanu, gan personalizētu rekomendāciju ģenerēšanu, balstoties uz lietotāja vēsturē "patīk" anime .
async function refillPool(userId: number): Promise<Anime[]> {
	const likes = await likedCount(userId);
	const usePersonalised = likes >= PERSONALISE_THRESHOLD;
	let res: AxiosResponse<any> | null = null;
	const gIds = usePersonalised ? await pickGenres(userId) : [];
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
		const recentLiked = await db.userAnime.findMany({
			where: {
				userId,
				liked: true,
			},
			orderBy: {
				createdAt: "desc",
			},
			take: 5,
		});

		const used = userRecommendationHistory.get(userId) ?? new Set<number>();
		const candidates = recentLiked.filter((a) => !used.has(a.animeId));

		const source =
			candidates.length > 0
				? candidates[Math.floor(Math.random() * candidates.length)]
				: recentLiked[Math.floor(Math.random() * recentLiked.length)];

		used.add(source.animeId);
		userRecommendationHistory.set(userId, used);

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
				genres: r.genres ?? [],
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
				searchGenres: usePersonalised || !recommendations ? gIds : [],
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

//šī funkcija atbild par anime rekomendāciju loģiku, tai skaitā gan populāro anime piedāvāšanu, gan personalizētu rekomendāciju ģenerēšanu, balstoties uz lietotāja vēsturē "patīk" anime .
async function takeFromPool(userId: number): Promise<Anime | null> {
	if (!userCache.has(userId)) {
		userCache.set(userId, { pool: [] });
	}

	const cache = userCache.get(userId)!;

	cache.pool = cache.pool.sort(
		(a: any, b: any) => (b.votes ?? 0) - (a.votes ?? 0),
	);

	while (cache.pool.length) {
		const pick = cache.pool.shift()!;
		const userAnime = await db.userAnime.findUnique({
			where: {
				userId_animeId: {
					userId,
					animeId: pick?.mal_id,
				},
			},
		});
		if (userAnime) {
			continue;
		}
		return pick;
	}

	const refill = await refillPool(userId);

	const seen = await db.userAnime.findMany({
		where: { userId },
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
				genres: r.genres ?? [],
				images: {
					jpg: {
						image_url: r.images?.jpg?.image_url || "",
						large_image_url: r.images?.jpg?.large_image_url || "",
					},
				},
				searchGenres: [],
				votes: 0,
			}))
			.filter((a: Anime) => !seenIds.has(a.mal_id));
	} else {
		cache.pool = refill.filter((anime) => !seenIds.has(anime.mal_id));
	}

	return takeFromPool(userId);
}

export async function getRandomAnime(userId: number): Promise<number | null> {
	const pick = await takeFromPool(userId);
	return pick?.mal_id ?? null;
}

export async function getRandomAnimeFull(
	userId: number,
): Promise<Anime | null> {
	const malId = await getRandomAnime(userId);
	if (!malId) return null;
	return getAnimeById(malId);
}
