import { signup } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
	const body = await req.json();

	try {
		const lietotajs = await signup(body.email, body.parole, body.vards);

		return NextResponse.json({ success: true, lietotajs });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}
}
