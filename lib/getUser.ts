import { db } from "@/lib/db";
import bcrypt from "bcrypt";

export async function panemtLietotajs(): Promise<number> {
	let lietotajs = await db.lietotajs.findUnique({
		where: { email: "test@example.com" },
	});
	if (!lietotajs) {
		const parole = "Password123!";
		const hash = await bcrypt.hash(parole, 12);
		lietotajs = await db.lietotajs.create({
			data: {
				pwd: hash,
				email: "test@example.com",
				vards: "Test Lietotajs",
			},
		});
	}

	return lietotajs.id;
}
