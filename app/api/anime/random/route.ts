import { NextResponse } from "next/server";
import { getRandomAnime, getAnimeById } from "@/lib/jikan";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
	try {
		const user = await getCurrentUser();
		const userId = user?.id;
		if (!userId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const malId = await getRandomAnime(userId);
		if (!malId) return NextResponse.json({ data: null }, { status: 204 });

		const anime = await getAnimeById(malId);

		if (!anime)
			return NextResponse.json({ data: { mal_id: malId } }, { status: 206 });

		return NextResponse.json({ data: anime });
	} catch (e) {
		console.error("API /anime/random error:", e);
		return NextResponse.json(
			{ error: "Failed to fetch anime" },
			{ status: 500 },
		);
	}
}
