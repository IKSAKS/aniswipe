import { NextResponse } from "next/server";
import { panemtRandomAnime, panemtAnimeById } from "@/lib/jikan";
import { panemtPasreizejoLietotaju } from "@/lib/auth";

export async function GET() {
	try {
		const lietotajs = await panemtPasreizejoLietotaju();
		const lietotajsId = lietotajs?.id;
		if (!lietotajsId)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const malId = await panemtRandomAnime(lietotajsId);
		if (!malId) return NextResponse.json({ data: null }, { status: 204 });

		const anime = await panemtAnimeById(malId);

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
