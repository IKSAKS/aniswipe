import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { panemtPasreizejoLietotaju, irAdmin } from "@/lib/auth";

type LietotajsRow = {
	id: number;
	vards?: string | null;
	email?: string | null;
};

export default async function DashboardPage() {
	const lietotajs = await panemtPasreizejoLietotaju();
	if (!lietotajs) redirect("/login");

	if (!(await irAdmin())) redirect("/library");

	const lietotajss = await db.lietotajs.findMany({
		select: { id: true, vards: true, email: true },
		orderBy: { vards: "asc" },
	});

	return (
		<main
			className="min-h-screen bg-gradient-to-br from-slate-900 via-[#071428]
                 to-slate-800 text-slate-100 p-6"
		>
			<div className="max-w-6xl mx-auto">
				<header className="flex items-start justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold">Dashboard</h1>
						<p className="text-sm text-slate-400 mt-1">
							{lietotajs.vards ?? lietotajs.email}
						</p>
					</div>
				</header>

				<section>
					<h2 className="text-xl font-semibold mb-3">All lietotajss</h2>

					{lietotajss.length ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
							{lietotajss.map((u: LietotajsRow) => {
								const label = u.vards ?? u.email ?? `Lietotajs ${u.id}`;
								return (
									<Link
										key={u.id}
										href={`/library?lietotajsid=${u.id}`}
										className="block bg-white/5 rounded-xl p-4 hover:bg-white/6
                               transition"
									>
										<div>
											<p className="font-semibold text-slate-100">{label}</p>
										</div>
									</Link>
								);
							})}
						</div>
					) : (
						<p className="text-slate-400">No lietotajss found.</p>
					)}
				</section>
			</div>
		</main>
	);
}
