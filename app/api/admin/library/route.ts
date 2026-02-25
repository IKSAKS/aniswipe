import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export async function POST(req: Request) {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}
	if (!(await isAdmin())) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	let body: any;
	try {
		body = await req.json();
	} catch (err) {
		return NextResponse.json({ error: "Invalid json" }, { status: 400 });
	}

	const action = body?.action;

	if (action === "removeLike") {
		const userId = Number(body.userId);
		const animeId = Number(body.animeId);
		if (!userId || !animeId) {
			return NextResponse.json({ error: "Missing params" }, { status: 400 });
		}
		await db.userAnime.updateMany({
			where: { userId, animeId },
			data: { liked: false },
		});
		return NextResponse.json({ ok: true });
	}

	if (action === "updateGenre") {
		const userId = Number(body.userId);
		const genreName = String(body.genreName ?? "").trim();
		const weight = Number(body.weight ?? 0);

		if (!userId || !genreName) {
			return NextResponse.json({ error: "Missing params" }, { status: 400 });
		}

		let genre = await db.genre.findFirst({ where: { name: genreName } });
		if (!genre) {
			genre = await db.genre.create({ data: { name: genreName } });
		}

		const updated = await db.userGenre.updateMany({
			where: { userId, genreId: genre.id },
			data: { weight },
		});

		if (updated.count === 0) {
			await db.userGenre.create({
				data: { userId, genreId: genre.id, weight },
			});
		}

		return NextResponse.json({ ok: true, weight });
	}

	return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
