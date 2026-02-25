import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { RoleName } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET!;

type JwtPayload = {
	userId: number;
};

export async function isAdmin() {
	const user = await getCurrentUser();
	if (!user) return false;
	if (!user.role) return false;
	return user.role === RoleName.ADMIN;
}

export async function signup(email: string, password: string, name: string) {
	const existing = await db.user.findUnique({
		where: { email },
	});

	if (existing) {
		throw new Error("User already exists");
	}

	const hash = await bcrypt.hash(password, 12);

	const user = await db.user.create({
		data: {
			email,
			name,
			pwd: hash,
		},
	});

	await createSession(user.id);

	return user;
}

export async function login(email: string, password: string) {
	const user = await db.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new Error("Invalid credentials");
	}

	const valid = await bcrypt.compare(password, user.pwd);

	if (!valid) {
		throw new Error("Invalid credentials");
	}

	await createSession(user.id);

	return user;
}

async function createSession(userId: number) {
	const token = jwt.sign({ userId }, JWT_SECRET, {
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

export async function getCurrentUser() {
	const token = (await cookies()).get("auth_token")?.value;

	if (!token) return null;

	try {
		const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

		const user = await db.user.findUnique({
			where: { id: decoded.userId },
		});

		return user;
	} catch {
		return null;
	}
}

export async function logout() {
	(await cookies()).delete("auth_token");
}
