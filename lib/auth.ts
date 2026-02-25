import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { LomasVards } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET!;

type JwtPayload = {
	lietotajsId: number;
};

export async function irAdmin() {
	const lietotajs = await panemtPasreizejaisLietotajs();
	if (!lietotajs) return false;
	if (!lietotajs.loma) return false;
	return lietotajs.loma === LomasVards.ADMIN;
}

export async function signup(email: string, parole: string, vards: string) {
	const existing = await db.lietotajs.findUnique({
		where: { email },
	});

	if (existing) {
		throw new Error("Lietotajs already exists");
	}

	const hash = await bcrypt.hash(parole, 12);

	const lietotajs = await db.lietotajs.create({
		data: {
			email,
			vards,
			pwd: hash,
		},
	});

	await createSession(lietotajs.id);

	return lietotajs;
}

export async function login(email: string, parole: string) {
	const lietotajs = await db.lietotajs.findUnique({
		where: { email },
	});

	if (!lietotajs) {
		throw new Error("Invalid credentials");
	}

	const valid = await bcrypt.compare(parole, lietotajs.pwd);

	if (!valid) {
		throw new Error("Invalid credentials");
	}

	await createSession(lietotajs.id);

	return lietotajs;
}

async function createSession(lietotajsId: number) {
	const token = jwt.sign({ lietotajsId }, JWT_SECRET, {
		expiresIn: "7d",
	});

	(await cookies()).set("auth_token", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});
}

export async function panemtPasreizejaisLietotajs() {
	const token = (await cookies()).panemt("auth_token")?.value;

	if (!token) return null;

	try {
		const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

		const lietotajs = await db.lietotajs.findUnique({
			where: { id: decoded.lietotajsId },
		});

		return lietotajs;
	} catch {
		return null;
	}
}

export async function logout() {
	(await cookies()).delete("auth_token");
}
