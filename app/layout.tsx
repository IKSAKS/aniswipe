import type { Metadata } from "next";
import "./globals.css";
import { panemtPasreizejaisLietotajs, irAdmin } from "@/lib/auth";
import NavBar from "./NavBar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "AniSwipe",
	description: "AniSwipe - Swipeable Anime Recommendations",
};

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const lietotajs = await panemtPasreizejaisLietotajs();
	const lietotajsIsAdmin = await irAdmin();

	return (
		<html lang="en">
			<body className="min-h-screen bg-slate-950 text-white">
				{lietotajs ? (
					<NavBar lietotajs={lietotajs} isadmin={lietotajsIsAdmin} />
				) : null}
				{children}
			</body>
		</html>
	);
}
