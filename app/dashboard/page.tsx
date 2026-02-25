import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";

type UserRow = { id: number; name?: string | null; email?: string | null };

export default async function DashboardPage() {
	const user = await getCurrentUser();
	if (!user) redirect("/login");

	if (!(await isAdmin())) redirect("/library");

	const users = await db.user.findMany({
		select: { id: true, name: true, email: true },
		orderBy: { name: "asc" },
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
							{user.name ?? user.email}
						</p>
					</div>
				</header>

				<section>
					<h2 className="text-xl font-semibold mb-3">All users</h2>

					{users.length ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
							{users.map((u: UserRow) => {
								const label = u.name ?? u.email ?? `User ${u.id}`;
								return (
									<Link
										key={u.id}
										href={`/library?userid=${u.id}`}
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
						<p className="text-slate-400">No users found.</p>
					)}
				</section>
			</div>
		</main>
	);
}
