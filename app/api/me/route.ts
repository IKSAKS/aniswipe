import { panemtPasreizejoLietotaju } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
	const lietotajs = await panemtPasreizejoLietotaju();

	if (!lietotajs) {
		return NextResponse.json(null, { status: 401 });
	}

	return NextResponse.json(lietotajs);
}
