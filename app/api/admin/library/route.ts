import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { panemtPasreizejaisLietotajs, irAdmin } from "@/lib/auth";

export async function POST(req: Request) {
	const lietotajs = await panemtPasreizejaisLietotajs();
	if (!lietotajs) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}
	if (!(await irAdmin())) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	let body: any;
	try {
		body = await req.json();
	} catch (err) {
		return NextResponse.json({ error: "Invalid json" }, { status: 400 });
	}

	const action = body?.action;

	if (action === "removePatik") {
		const lietotajsId = Number(body.lietotajsId);
		const animeId = Number(body.animeId);
		if (!lietotajsId || !animeId) {
			return NextResponse.json({ error: "Missing params" }, { status: 400 });
		}
		await db.lietotajsAnime.updateMany({
			where: { lietotajsId, animeId },
			data: { patik: false },
		});
		return NextResponse.json({ ok: true });
	}

	if (action === "updateZanrs") {
		const lietotajsId = Number(body.lietotajsId);
		const zanrsName = String(body.zanrsName ?? "").trim();
		const smagums = Number(body.smagums ?? 0);

		if (!lietotajsId || !zanrsName) {
			return NextResponse.json({ error: "Missing params" }, { status: 400 });
		}

		let zanrs = await db.zanrs.findFirst({ where: { vards: zanrsName } });
		if (!zanrs) {
			zanrs = await db.zanrs.create({ data: { vards: zanrsName } });
		}

		const updated = await db.lietotajsZanrs.updateMany({
			where: { lietotajsId, zanrsId: zanrs.id },
			data: { smagums },
		});

		if (updated.count === 0) {
			await db.lietotajsZanrs.create({
				data: { lietotajsId, zanrsId: zanrs.id, smagums },
			});
		}

		return NextResponse.json({ ok: true, smagums });
	}

	return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
