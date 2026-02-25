import { signup } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
	const body = await req.json();

	try {
		const user = await signup(body.email, body.password, body.name);

		return NextResponse.json({ success: true, user });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}
}
