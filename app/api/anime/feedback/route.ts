import { NextResponse } from "next/server";
import { registerPreference } from "@/lib/jikan";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
	const body = await req.json();
	const user = await getCurrentUser();
	const userId = user?.id;
	if (!userId)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { anime, liked, searchGenres } = body;
	if (anime && typeof liked === "boolean") {
		registerPreference(
			anime,
			liked,
			Array.isArray(searchGenres) ? searchGenres : [],
			userId,
		);
	}
	return NextResponse.json({ ok: true });
}
