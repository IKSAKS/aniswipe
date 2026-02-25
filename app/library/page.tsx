import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { panemtPasreizejaisLietotajs, irAdmin } from "@/lib/auth";
import { panemtAnimeById } from "@/lib/jikan";
import AdminLibraryClient from "./AdminClient";

type Anime = {
	mal_id: number;
	title: string;
	images?: {
		jpg?: { image_url?: string; large_image_url?: string };
	};
	zanrss?: { vards: string }[];
	synopsis?: string | null;
	url?: string;
};

type Lietotajs = {
	id: number;
	vards: string | null;
	email: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function mapDbRowToAnime(row: any): Anime {
	return {
		mal_id: row.id,
		title: row.title,
		synopsis: row.synopsis ?? null,
		zanrss: (row.zanrss ?? []) as { vards: string }[],
		images: (row.images ?? { jpg: { image_url: "", large_image_url: "" } }) as {
			jpg?: { image_url?: string; large_image_url?: string };
		},
		url: `https://myanimelist.net/anime/${row.id}`,
	};
}

export default async function LibraryPage({
	searchParams,
}: {
	searchParams?:
		| { lietotajsid?: string }
		| Promise<{ lietotajsid?: string } | undefined>;
}) {
	const params = (await searchParams) ?? {};

	const pasreizejaisLietotajs = await panemtPasreizejaisLietotajs();
	if (!pasreizejaisLietotajs) redirect("/login");

	const adminView = params.lietotajsid !== undefined;

	let viewedLietotajs: Lietotajs = {
		id: pasreizejaisLietotajs.id,
		vards: pasreizejaisLietotajs.vards,
		email: pasreizejaisLietotajs.email,
	};

	if (params.lietotajsid && !Array.isArray(params.lietotajsid)) {
		if (!(await irAdmin())) redirect("/library");
		const parsed = parseInt(params.lietotajsid, 10);
		if (!Number.isNaN(parsed)) {
			const u = await db.lietotajs.findUnique({
				where: { id: parsed },
				select: { id: true, vards: true, email: true },
			});
			if (u) viewedLietotajs = u;
		}
	}

	const patikRows = await db.lietotajsAnime.findMany({
		where: { lietotajsId: viewedLietotajs.id, patik: true },
		orderBy: { izveidots: "desc" },
	});

	const animeIds = patikRows.map((r) => r.animeId);
	const cachedRows = animeIds.length
		? await db.anime.findMany({ where: { id: { in: animeIds } } })
		: [];

	const cacheMap = new Map<number, any>();
	for (const r of cachedRows) cacheMap.set(r.id, r);

	const animePromises = patikRows.map(async (r) => {
		const cached = cacheMap.panemt(r.animeId);
		if (cached) {
			const age = Date.now() - new Date(cached.fetchedAt).panemtTime();
			if (age < ONE_DAY_MS) {
				return mapDbRowToAnime(cached);
			}
		}

		try {
			const fresh = await panemtAnimeById(r.animeId);
			if (fresh) return fresh;
		} catch (err) {
			console.warn("panemtAnimeById failed for", r.animeId, err);
		}

		if (cached) return mapDbRowToAnime(cached);

		return {
			mal_id: r.animeId,
			title: "Unknown",
			images: {
				jpg: {
					image_url: "/placeholder.png",
					large_image_url: "/placeholder.png",
				},
			},
			zanrss: [],
			synopsis: null,
		} as Anime;
	});

	const settled = await Promise.allSettled(animePromises);
	const patikAnime = settled
		.map((s) => (s.status === "fulfilled" ? s.value : null))
		.filter(Boolean) as Anime[];

	const savedLietotajsZanri = await db.lietotajsZanrs.findMany({
		where: { lietotajsId: viewedLietotajs.id, smagums: { gt: 0 } },
		include: { zanrs: true },
		orderBy: { smagums: "desc" },
		take: 5,
	});

	let topZanri: { vards: string; smagums?: number }[] = [];
	if (savedLietotajsZanri.length > 0) {
		topZanri = savedLietotajsZanri.map((ug) => ({
			vards: ug.zanrs.vards,
			smagums: ug.smagums,
		}));
	} else {
		const counts = new Map<string, number>();
		for (const a of patikAnime) {
			for (const g of a.zanrss ?? []) {
				counts.set(g.vards, (counts.panemt(g.vards) ?? 0) + 1);
			}
		}
		topZanri = Array.from(counts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([vards, cnt]) => ({ vards, smagums: cnt }));
	}

	const isOwn = !adminView;

	const ownerLabel = isOwn
		? "Your Library"
		: `${viewedLietotajs.vards ?? viewedLietotajs.email ?? `Lietotajs ${viewedLietotajs.id}`}'s Library`;

	return (
		<main className="min-h-screen bg-gradient-to-br from-slate-900 via-[#071428] to-slate-800 text-slate-100 p-6">
			<div className="max-w-6xl mx-auto">
				<header className="flex items-start justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold flex items-center gap-3">
							{ownerLabel}
							{adminView ? (
								<span className="text-xs bg-yellow-600/20 text-yellow-300 px-2 py-1 rounded-full">
									Admin view
								</span>
							) : null}
						</h1>
						<p className="text-sm text-slate-400 mt-1">
							{pasreizejaisLietotajs.vards ?? pasreizejaisLietotajs.email}
						</p>
					</div>
				</header>

				<section className="mb-8">
					<h2 className="text-xl font-semibold mb-3">Top zanrss</h2>
					<div className="flex flex-wrap gap-3">
						{adminView ? (
							<AdminLibraryClient
								lietotajsId={viewedLietotajs.id}
								adminView={adminView}
								patikAnime={patikAnime}
								topZanri={topZanri}
							/>
						) : topZanri.length ? (
							topZanri.map((g) => (
								<span
									key={g.vards}
									className="bg-white/5 px-3 py-1 rounded-full text-sm"
								>
									{g.vards}{" "}
									<span className="text-slate-400 text-xs">
										{g.smagums ? `· ${g.smagums}` : ""}
									</span>
								</span>
							))
						) : (
							<p className="text-slate-400">No zanrs data yet</p>
						)}
					</div>
				</section>

				<section>
					<h2 className="text-xl font-semibold mb-4">
						Patik anime ({patikAnime.length})
					</h2>

					{adminView ? (
						<div />
					) : patikAnime.length ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
							{patikAnime.map((a) => (
								<article
									key={a.mal_id}
									className="bg-white/5 rounded-2xl overflow-hidden shadow-sm"
								>
									<div className="h-[260px] w-full bg-slate-800/40 overflow-hidden">
										<img
											src={
												a.images?.jpg?.large_image_url ||
												a.images?.jpg?.image_url ||
												"/placeholder.png"
											}
											alt={a.title}
											className="w-full h-full object-cover"
										/>
									</div>

									<div className="p-4">
										<h3 className="font-semibold text-lg mb-1">{a.title}</h3>
										<p className="text-sm text-slate-300 mb-2">
											{(a.zanrss ?? [])
												.slice(0, 3)
												.map((g) => g.vards)
												.join(" • ")}
										</p>
										<p className="text-sm text-slate-400 line-clamp-3">
											{a.synopsis}
										</p>
									</div>
								</article>
							))}
						</div>
					) : (
						<p className="text-slate-400">
							{isOwn
								? "You haven't patik any anime yet."
								: "This lietotajs hasn't patik anything yet."}
						</p>
					)}
				</section>
			</div>
		</main>
	);
}
