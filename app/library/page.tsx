import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getAnimeById } from "@/lib/jikan";
import AdminLibraryClient from "./AdminClient";

type Anime = {
	mal_id: number;
	title: string;
	images?: {
		jpg?: { image_url?: string; large_image_url?: string };
	};
	genres?: { name: string }[];
	synopsis?: string | null;
	url?: string;
};

type User = {
	id: number;
	name: string | null;
	email: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function mapDbRowToAnime(row: any): Anime {
	return {
		mal_id: row.id,
		title: row.title,
		synopsis: row.synopsis ?? null,
		genres: (row.genres ?? []) as { name: string }[],
		images: (row.images ?? { jpg: { image_url: "", large_image_url: "" } }) as {
			jpg?: { image_url?: string; large_image_url?: string };
		},
		url: `https://myanimelist.net/anime/${row.id}`,
	};
}

export default async function LibraryPage({
	searchParams,
}: {
	searchParams?: { userid?: string } | Promise<{ userid?: string } | undefined>;
}) {
	const params = (await searchParams) ?? {};

	const currentUser = await getCurrentUser();
	if (!currentUser) redirect("/login");

	const adminView = params.userid !== undefined;

	let viewedUser: User = {
		id: currentUser.id,
		name: currentUser.name,
		email: currentUser.email,
	};

	if (params.userid && !Array.isArray(params.userid)) {
		if (!(await isAdmin())) redirect("/library");
		const parsed = parseInt(params.userid, 10);
		if (!Number.isNaN(parsed)) {
			const u = await db.user.findUnique({
				where: { id: parsed },
				select: { id: true, name: true, email: true },
			});
			if (u) viewedUser = u;
		}
	}

	const likedRows = await db.userAnime.findMany({
		where: { userId: viewedUser.id, liked: true },
		orderBy: { createdAt: "desc" },
	});

	const animeIds = likedRows.map((r) => r.animeId);
	const cachedRows = animeIds.length
		? await db.anime.findMany({ where: { id: { in: animeIds } } })
		: [];

	const cacheMap = new Map<number, any>();
	for (const r of cachedRows) cacheMap.set(r.id, r);

	const animePromises = likedRows.map(async (r) => {
		const cached = cacheMap.get(r.animeId);
		if (cached) {
			const age = Date.now() - new Date(cached.fetchedAt).getTime();
			if (age < ONE_DAY_MS) {
				return mapDbRowToAnime(cached);
			}
		}

		try {
			const fresh = await getAnimeById(r.animeId);
			if (fresh) return fresh;
		} catch (err) {
			console.warn("getAnimeById failed for", r.animeId, err);
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
			genres: [],
			synopsis: null,
		} as Anime;
	});

	const settled = await Promise.allSettled(animePromises);
	const likedAnime = settled
		.map((s) => (s.status === "fulfilled" ? s.value : null))
		.filter(Boolean) as Anime[];

	const savedUserGenres = await db.userGenre.findMany({
		where: { userId: viewedUser.id, weight: { gt: 0 } },
		include: { genre: true },
		orderBy: { weight: "desc" },
		take: 5,
	});

	let topGenres: { name: string; weight?: number }[] = [];
	if (savedUserGenres.length > 0) {
		topGenres = savedUserGenres.map((ug) => ({
			name: ug.genre.name,
			weight: ug.weight,
		}));
	} else {
		const counts = new Map<string, number>();
		for (const a of likedAnime) {
			for (const g of a.genres ?? []) {
				counts.set(g.name, (counts.get(g.name) ?? 0) + 1);
			}
		}
		topGenres = Array.from(counts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([name, cnt]) => ({ name, weight: cnt }));
	}

	const isOwn = !adminView;

	const ownerLabel = isOwn
		? "Your Library"
		: `${viewedUser.name ?? viewedUser.email ?? `User ${viewedUser.id}`}'s Library`;

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
							{currentUser.name ?? currentUser.email}
						</p>
					</div>
				</header>

				<section className="mb-8">
					<h2 className="text-xl font-semibold mb-3">Top genres</h2>
					<div className="flex flex-wrap gap-3">
						{adminView ? (
							<AdminLibraryClient
								userId={viewedUser.id}
								adminView={adminView}
								likedAnime={likedAnime}
								topGenres={topGenres}
							/>
						) : topGenres.length ? (
							topGenres.map((g) => (
								<span
									key={g.name}
									className="bg-white/5 px-3 py-1 rounded-full text-sm"
								>
									{g.name}{" "}
									<span className="text-slate-400 text-xs">
										{g.weight ? `· ${g.weight}` : ""}
									</span>
								</span>
							))
						) : (
							<p className="text-slate-400">No genre data yet</p>
						)}
					</div>
				</section>

				<section>
					<h2 className="text-xl font-semibold mb-4">
						Liked anime ({likedAnime.length})
					</h2>

					{adminView ? (
						<div />
					) : likedAnime.length ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
							{likedAnime.map((a) => (
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
											{(a.genres ?? [])
												.slice(0, 3)
												.map((g) => g.name)
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
								? "You haven't liked any anime yet."
								: "This user hasn't liked anything yet."}
						</p>
					)}
				</section>
			</div>
		</main>
	);
}
