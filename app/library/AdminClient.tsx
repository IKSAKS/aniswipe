"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

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

type TopGenre = { name: string; weight?: number };

export default function AdminLibraryClient({
	userId,
	likedAnime,
	topGenres,
	adminView,
}: {
	userId: number;
	likedAnime: Anime[];
	topGenres: TopGenre[];
	adminView: boolean;
}) {
	const router = useRouter();
	const [editing, setEditing] = useState<Record<string, boolean>>({});
	const [values, setValues] = useState<Record<string, string>>(
		Object.fromEntries(
			topGenres.map((g) => [g.name, g.weight != null ? String(g.weight) : "0"]),
		),
	);
	const [savingGenre, setSavingGenre] = useState<Record<string, boolean>>({});
	const [removing, setRemoving] = useState<Record<number, boolean>>({});

	async function saveGenre(name: string) {
		const raw = values[name];
		const weight = Number(raw);
		setSavingGenre((s) => ({ ...s, [name]: true }));
		try {
			const res = await fetch("/api/admin/library", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "updateGenre",
					userId,
					genreName: name,
					weight,
				}),
			});
			if (!res.ok) {
				const txt = await res.text();
				alert("Failed to save genre: " + txt);
			} else {
				setEditing((e) => ({ ...e, [name]: false }));
				router.refresh();
			}
		} catch (err) {
			console.error(err);
			alert("Network error when saving genre");
		} finally {
			setSavingGenre((s) => ({ ...s, [name]: false }));
		}
	}

	async function removeLike(animeId: number) {
		if (!confirm("Remove this liked anime from the user?")) return;
		setRemoving((r) => ({ ...r, [animeId]: true }));
		try {
			const res = await fetch("/api/admin/library", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "removeLike",
					userId,
					animeId,
				}),
			});
			if (!res.ok) {
				const txt = await res.text();
				alert("Failed to remove like: " + txt);
			} else {
				router.refresh();
			}
		} catch (err) {
			console.error(err);
			alert("Network error when removing like");
		} finally {
			setRemoving((r) => ({ ...r, [animeId]: false }));
		}
	}

	const genresUi = topGenres.length ? (
		topGenres.map((g) => {
			const name = g.name;
			const isEditing = !!editing[name];
			return isEditing ? (
				<input
					key={name}
					value={values[name] ?? ""}
					onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
					onBlur={() => saveGenre(name)}
					onKeyDown={(e) => {
						if (e.key === "Enter") saveGenre(name);
						if (e.key === "Escape")
							setEditing((s) => ({ ...s, [name]: false }));
					}}
					className="bg-white/5 px-3 py-1 rounded-full text-sm w-20
            text-left outline-none placeholder:text-slate-400"
					autoFocus
				/>
			) : (
				<button
					key={name}
					onClick={() => setEditing((s) => ({ ...s, [name]: true }))}
					className="bg-white/5 px-3 py-1 rounded-full text-sm
            flex items-center gap-2"
					title="Click to edit weight"
				>
					<span>{name}</span>
					<span className="text-slate-400 text-xs">
						{g.weight ? `· ${g.weight}` : ""}
					</span>
				</button>
			);
		})
	) : (
		<p className="text-slate-400">No genre data yet</p>
	);

	const animeGrid = likedAnime.length ? (
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
			{likedAnime.map((a) => (
				<article
					key={a.mal_id}
					className="bg-white/5 rounded-2xl overflow-hidden shadow-sm"
				>
					<div className="relative h-[260px] w-full bg-slate-800/40 overflow-hidden">
						{adminView ? (
							<button
								onClick={() => removeLike(a.mal_id)}
								disabled={!!removing[a.mal_id]}
								aria-label="Remove liked anime"
								className="absolute top-3 right-3 z-10 bg-red-600 text-white
                  w-8 h-8 rounded-full flex items-center justify-center
                  hover:bg-red-500"
							>
								{removing[a.mal_id] ? "…" : "✕"}
							</button>
						) : null}
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
						<p className="text-sm text-slate-400 line-clamp-3">{a.synopsis}</p>
					</div>
				</article>
			))}
		</div>
	) : (
		<p className="text-slate-400 mt-2">This user hasn't liked anything yet.</p>
	);

	return (
		<div className="w-full">
			<div className="flex flex-wrap gap-3">{genresUi}</div>

			{/* show grid for admin view; otherwise the server page shows it */}
			{adminView ? animeGrid : null}
		</div>
	);
}
