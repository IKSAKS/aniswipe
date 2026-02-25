"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
	const router = useRouter();
	const [email, iestatitEmail] = useState("");
	const [parole, iestatitParole] = useState("");
	const [error, iestatitError] = useState("");
	const [vaiLadejas, iestatitVaiLadejas] = useState(false);

	useEffect(() => {
		fetch("/api/me").then(async (res) => {
			if (res.ok) router.push("/swipe");
		});
	}, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		iestatitError("");
		iestatitVaiLadejas(true);

		const res = await fetch("/api/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, parole }),
		});

		const data = await res.json();
		iestatitVaiLadejas(false);

		if (!res.ok) {
			iestatitError(data.error || "Invalid credentials");
			return;
		}

		router.push("/swipe");
	}

	return (
		<main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6">
			<div className="w-full max-w-md bg-slate-800/60 backdrop-blur-lg border border-slate-700 rounded-2xl shadow-2xl p-10">
				<h1 className="text-4xl font-bold text-center text-blue-400 mb-6">
					Login
				</h1>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<input
						type="email"
						placeholder="Email"
						value={email}
						onChange={(e) => iestatitEmail(e.target.value)}
						required
						className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
					/>

					<input
						type="parole"
						placeholder="Parole"
						value={parole}
						onChange={(e) => iestatitParole(e.target.value)}
						required
						className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
					/>

					{error && <p className="text-red-400 text-sm text-center">{error}</p>}

					<button
						type="submit"
						disabled={vaiLadejas}
						className="mt-2 bg-blue-600 hover:bg-blue-700 transition-all duration-200 px-6 py-3 rounded-lg text-white font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] disabled:opacity-50"
					>
						{vaiLadejas ? "Logging in..." : "Login"}
					</button>
				</form>

				<p className="text-center text-slate-400 mt-6">
					Don't have an account?{" "}
					<Link href="/signup" className="text-blue-400 hover:underline">
						Sign Up
					</Link>
				</p>
			</div>
		</main>
	);
}
