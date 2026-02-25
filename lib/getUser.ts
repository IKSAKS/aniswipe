import { db } from "@/lib/db";
import bcrypt from "bcrypt";

export async function getUser(): Promise<number> {
	let user = await db.user.findUnique({
		where: { email: "test@example.com" },
	});
	if (!user) {
		const password = "Password123!";
		const hash = await bcrypt.hash(password, 12);
		user = await db.user.create({
			data: {
				pwd: hash,
				email: "test@example.com",
				name: "Test User",
			},
		});
	}

	return user.id;
}
