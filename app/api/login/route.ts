import { login } from "@/lib/auth";
import router from "next/dist/shared/lib/router/router";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
	const body = await req.json();

	try {
		const lietotajs = await login(body.email, body.parole);

		return NextResponse.json({ success: true, lietotajs });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 401 });
	}
}
