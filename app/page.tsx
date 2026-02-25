"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
	const [lietotajs, iestatitLietotajs] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/me").then(async (res) => {
			if (res.ok) {
				const data = await res.json();
				iestatitLietotajs(data.vards);
			}
		});
	}, []);

	return (
		<main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6">
			<div className="text-center max-w-xl">
				<h1 className="text-5xl font-bold text-blue-400 mb-6">AniSwipe</h1>

				<p className="text-lg text-slate-300 mb-10">
					Discover new anime in a fun, swipe-based experience. Find your next
					favorite show in seconds.
				</p>

				{lietotajs ? (
					<p className="text-slate-400">Welcome back, {lietotajs}!</p>
				) : (
					<div className="flex justify-center gap-4">
						<Link
							href="/login"
							className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 px-6 py-3 rounded-lg text-white font-semibold shadow-md hover:shadow-lg hover:scale-[1.02]"
						>
							Login
						</Link>

						<Link
							href="/signup"
							className="border border-slate-600 hover:border-blue-500 transition px-6 py-3 rounded-lg text-white font-semibold"
						>
							Sign Up
						</Link>
					</div>
				)}
			</div>
		</main>
	);
}
