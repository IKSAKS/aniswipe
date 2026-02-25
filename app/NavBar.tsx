"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Lietotajs = {
	id: number;
	vards: string | null;
	email: string;
	pwd: string;
};

export default function NavBar({
	lietotajs,
	isadmin,
}: {
	lietotajs: Lietotajs | null;
	isadmin: boolean;
}) {
	const router = useRouter();
	const [vaiLadejas, iestatitVaiLadejas] = useState(false);

	if (!lietotajs) return null;

	useEffect(() => {}, [lietotajs]);

	async function handleLogout() {
		iestatitVaiLadejas(true);
		try {
			await fetch("/api/logout", { method: "POST" });
		} catch (err) {
			console.error("logout error", err);
		} finally {
			iestatitVaiLadejas(false);
			router.push("/");
			router.refresh();
		}
	}

	return (
		<div className="absolute top-6 right-6 flex items-center gap-4 z-50">
			<p className="text-slate-400 text-sm">
				Welcome, {lietotajs.vards ?? lietotajs.email}
			</p>
			<Link
				href="/swipe"
				className="bg-white/5 px-3 py-2 rounded-md text-sm font-medium
         text-slate-100 hover:bg-white/10 transition"
			>
				Swipe
			</Link>
			<Link
				href="/library"
				className="bg-white/5 px-3 py-2 rounded-md text-sm font-medium
         text-slate-100 hover:bg-white/10 transition"
			>
				Library
			</Link>
			{isadmin ? (
				<Link
					href="/dashboard"
					className="bg-white/5 px-3 py-2 rounded-md text-sm font-medium
         text-slate-100 hover:bg-white/10 transition"
				>
					Dashboard
				</Link>
			) : null}
			<button
				onClick={handleLogout}
				disabled={vaiLadejas}
				className="bg-red-600 hover:bg-red-700 transition-all duration-200
         px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md
         hover:shadow-lg hover:scale-[1.02]"
			>
				{vaiLadejas ? "Logging out..." : "Logout"}
			</button>
		</div>
	);
}
