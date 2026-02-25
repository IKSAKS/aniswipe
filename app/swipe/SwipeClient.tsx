"use client";

import { useEffect, useState, useRef } from "react";
import { Anime } from "@/lib/jikan";
import {
	motion,
	AnimatePresence,
	useMotionValue,
	useTransform,
} from "framer-motion";
import { XMarkIcon, HeartIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";

function SkeletonCard() {
	return (
		<div className="relative z-10 w-[95%] max-w-md bg-white/5 backdrop-blur-sm border border-white/10 shadow-xl rounded-2xl overflow-hidden animate-pulse">
			<div className="relative h-[55vh] sm:h-[400px] w-full bg-slate-800/60"></div>
			<div className="absolute bottom-6 left-5 h-4 w-48 bg-slate-600/60 rounded"></div>
			<div className="absolute bottom-3 left-5 h-3 w-32 bg-slate-700/50 rounded"></div>
		</div>
	);
}

type Lietotajs = {
	vards: string | null;
	id: number;
	email: string;
	pwd: string;
};

export default function SwipeClient({ lietotajs }: { lietotajs: Lietotajs }) {
	const router = useRouter();

	const [anime, iestatitAnime] = useState<Anime | null>(null);
	const [searchZanri, iestatitSearchZanri] = useState<number[]>([]);
	const [nextAnime, iestatitNakamoAnime] = useState<Anime | null>(null);
	const [vaiLadejas, iestatitVaiLadejas] = useState(true);

	const ielade = useRef(false);

	const x = useMotionValue(0);
	const rotate = useTransform(x, [-150, 150], [-10, 10]);
	const opacity = useTransform(x, [-200, 0, 200], [0.3, 1, 0.3]);

	async function handleLogout() {
		await fetch("/api/logout", { method: "POST" });
		router.push("/");
		router.refresh();
	}

	async function ieladetAnime(): Promise<Anime | null> {
		if (ielade.current) return null;
		ielade.current = true;

		try {
			const res = await fetch("/api/anime/random");
			if (!res.ok) throw new Error("HTTP " + res.status);

			const data = await res.json();

			if (data?.data?.mal_id) {
				const ani = data.data as Anime;
				iestatitSearchZanri(ani.searchZanri || []);
				return ani;
			}
		} catch (err) {
			console.error("ieladetAnime:", err);
		} finally {
			ielade.current = false;
		}

		return null;
	}

	useEffect(() => {
		(async () => {
			const first = await ieladetAnime();
			const second = await ieladetAnime();
			iestatitAnime(first);
			iestatitNakamoAnime(second);
			iestatitVaiLadejas(false);
		})();
	}, []);

	const preloadNakamo = async () => {
		return await ieladetAnime();
	};

	const panemtNakamoAnime = async () => {
		iestatitVaiLadejas(true);

		const pasreizejaisNakamo = nextAnime ?? (await preloadNakamo());
		iestatitAnime(pasreizejaisNakamo);

		const preload = await preloadNakamo();
		iestatitNakamoAnime(preload);

		x.set(0);
		iestatitVaiLadejas(false);
	};

	const sendFeedback = async (patik: boolean) => {
		if (!anime) return;

		await fetch("/api/anime/feedback", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				anime,
				patik,
				searchZanri,
				lietotajsId: lietotajs.id,
			}),
		});
	};

	const handlePatik = async () => {
		await sendFeedback(true);
		await panemtNakamoAnime();
	};

	const handleNepatik = async () => {
		await sendFeedback(false);
		await panemtNakamoAnime();
	};

	const zanrss =
		anime?.zanrss
			?.map((g) => g.vards)
			.slice(0, 3)
			.join(" • ") || "No zanrs data";

	return (
		<main className="flex flex-col items-center justify-center h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-800 text-slate-100 select-none">
			<AnimatePresence mode="wait">
				{!vaiLadejas && anime ? (
					<motion.div
						key={anime.mal_id}
						style={{ x, rotate, opacity }}
						drag="x"
						dragConstraints={{ left: 0, right: 0 }}
						dragElastic={0.8}
						onDragEnd={() => {
							if (Math.abs(x.get()) > 120) panemtNakamoAnime();
							else x.set(0);
						}}
						initial={{ scale: 0.95, opacity: 0, y: 20 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						exit={{ scale: 0.95, opacity: 0, y: -20 }}
						transition={{
							duration: 0.4,
							type: "spring",
						}}
						className="relative z-10 w-[95%] max-w-md bg-white/10 backdrop-blur-sm border border-white/10 shadow-xl rounded-2xl overflow-hidden"
					>
						<div className="relative h-[55vh] sm:h-[400px] w-full overflow-hidden">
							<img
								src={
									anime.images?.jpg?.large_image_url ||
									anime.images?.jpg?.image_url
								}
								alt={anime.title}
								className="w-full h-full object-cover"
							/>
							<div className="absolute iniestatit-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
							<div className="absolute bottom-0 left-0 p-5 text-left w-full">
								<h2 className="text-2xl font-semibold text-white drop-shadow-md">
									{anime.title}
								</h2>
								<p className="text-sm text-slate-300 mt-1">{zanrss}</p>
							</div>
						</div>
					</motion.div>
				) : (
					<SkeletonCard />
				)}
			</AnimatePresence>

			<div className="flex gap-10 mt-8 relative z-20">
				<button
					onClick={handleNepatik}
					className="p-4 bg-red-500/90 hover:bg-red-600 rounded-full transition shadow-[0_0_30px_rgba(239,68,68,0.4)]"
					title="Nepatik"
				>
					<XMarkIcon className="w-8 h-8 text-white" />
				</button>

				<button
					onClick={panemtNakamoAnime}
					className="p-4 bg-sky-500/90 hover:bg-sky-600 rounded-full transition shadow-[0_0_30px_rgba(56,189,248,0.4)]"
					title="Reload"
				>
					<ArrowPathIcon className="w-7 h-7 text-white" />
				</button>

				<button
					onClick={handlePatik}
					className="p-4 bg-green-500/90 hover:bg-green-600 rounded-full transition shadow-[0_0_30px_rgba(34,197,94,0.4)]"
					title="Patik"
				>
					<HeartIcon className="w-8 h-8 text-white" />
				</button>
			</div>
		</main>
	);
}
