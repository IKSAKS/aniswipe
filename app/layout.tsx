import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser, isAdmin } from "@/lib/auth";
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
	const user = await getCurrentUser();
	const userIsAdmin = await isAdmin();

	return (
		<html lang="en">
			<body className="min-h-screen bg-slate-950 text-white">
				{user ? <NavBar user={user} isadmin={userIsAdmin} /> : null}
				{children}
			</body>
		</html>
	);
}
