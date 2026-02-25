"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

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

type TopZanrs = { vards: string; smagums?: number };

export default function AdminLibraryClient({
	lietotajsId,
	patikAnime,
	topZanri,
	adminView,
}: {
	lietotajsId: number;
	patikAnime: Anime[];
	topZanri: TopZanrs[];
	adminView: boolean;
}) {
	const router = useRouter();
	const [editing, iestatitEditing] = useState<Record<string, boolean>>({});
	const [values, iestatitValues] = useState<Record<string, string>>(
		Object.fromEntries(
			topZanri.map((g) => [
				g.vards,
				g.smagums != null ? String(g.smagums) : "0",
			]),
		),
	);
	const [savingZanrs, iestatitSavingZanrs] = useState<Record<string, boolean>>(
		{},
	);
	const [removing, iestatitRemoving] = useState<Record<number, boolean>>({});

	async function saveZanrs(vards: string) {
		const raw = values[vards];
		const smagums = Number(raw);
		iestatitSavingZanrs((s) => ({ ...s, [vards]: true }));
		try {
			const res = await fetch("/api/admin/library", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "updateZanrs",
					lietotajsId,
					zanrsName: vards,
					smagums,
				}),
			});
			if (!res.ok) {
				const txt = await res.text();
				alert("Failed to save zanrs: " + txt);
			} else {
				iestatitEditing((e) => ({ ...e, [vards]: false }));
				router.refresh();
			}
		} catch (err) {
			console.error(err);
			alert("Network error when saving zanrs");
		} finally {
			iestatitSavingZanrs((s) => ({ ...s, [vards]: false }));
		}
	}

	async function removePatik(animeId: number) {
		if (!confirm("Remove this patik anime from the lietotajs?")) return;
		iestatitRemoving((r) => ({ ...r, [animeId]: true }));
		try {
			const res = await fetch("/api/admin/library", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "removePatik",
					lietotajsId,
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
			iestatitRemoving((r) => ({ ...r, [animeId]: false }));
		}
	}

	const zanrssUi = topZanri.length ? (
		topZanri.map((g) => {
			const vards = g.vards;
			const isEditing = !!editing[vards];
			return isEditing ? (
				<input
					key={vards}
					value={values[vards] ?? ""}
					onChange={(e) =>
						iestatitValues((v) => ({ ...v, [vards]: e.tarpanemt.value }))
					}
					onBlur={() => saveZanrs(vards)}
					onKeyDown={(e) => {
						if (e.key === "Enter") saveZanrs(vards);
						if (e.key === "Escape")
							iestatitEditing((s) => ({ ...s, [vards]: false }));
					}}
					className="bg-white/5 px-3 py-1 rounded-full text-sm w-20
            text-left outline-none placeholder:text-slate-400"
					autoFocus
				/>
			) : (
				<button
					key={vards}
					onClick={() => iestatitEditing((s) => ({ ...s, [vards]: true }))}
					className="bg-white/5 px-3 py-1 rounded-full text-sm
            flex items-center gap-2"
					title="Click to edit smagums"
				>
					<span>{vards}</span>
					<span className="text-slate-400 text-xs">
						{g.smagums ? `· ${g.smagums}` : ""}
					</span>
				</button>
			);
		})
	) : (
		<p className="text-slate-400">No zanrs data yet</p>
	);

	const animeGrid = patikAnime.length ? (
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
			{patikAnime.map((a) => (
				<article
					key={a.mal_id}
					className="bg-white/5 rounded-2xl overflow-hidden shadow-sm"
				>
					<div className="relative h-[260px] w-full bg-slate-800/40 overflow-hidden">
						{adminView ? (
							<button
								onClick={() => removePatik(a.mal_id)}
								disabled={!!removing[a.mal_id]}
								aria-label="Remove patik anime"
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
							{(a.zanrss ?? [])
								.slice(0, 3)
								.map((g) => g.vards)
								.join(" • ")}
						</p>
						<p className="text-sm text-slate-400 line-clamp-3">{a.synopsis}</p>
					</div>
				</article>
			))}
		</div>
	) : (
		<p className="text-slate-400 mt-2">
			This lietotajs hasn't patik anything yet.
		</p>
	);

	return (
		<div className="w-full">
			<div className="flex flex-wrap gap-3">{zanrssUi}</div>

			{/* show grid for admin view; otherwise the server page shows it */}
			{adminView ? animeGrid : null}
		</div>
	);
}
