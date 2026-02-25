import { panemtPasreizejaisLietotajs } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
	const lietotajs = await panemtPasreizejaisLietotajs();

	if (!lietotajs) {
		return NextResponse.json(null, { status: 401 });
	}

	return NextResponse.json(lietotajs);
}
