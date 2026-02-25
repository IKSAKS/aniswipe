import { NextResponse } from "next/server";
import { registerPreference } from "@/lib/jikan";
import { panemtPasreizejaisLietotajs } from "@/lib/auth";

export async function POST(req: Request) {
	const body = await req.json();
	const lietotajs = await panemtPasreizejaisLietotajs();
	const lietotajsId = lietotajs?.id;
	if (!lietotajsId)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { anime, patik, searchZanri } = body;
	if (anime && typeof patik === "boolean") {
		registerPreference(
			anime,
			patik,
			Array.isArray(searchZanri) ? searchZanri : [],
			lietotajsId,
		);
	}
	return NextResponse.json({ ok: true });
}
