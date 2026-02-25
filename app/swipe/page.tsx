import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import SwipeClient from "./SwipeClient";

export default async function SwipePage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	return <SwipeClient user={user} />;
}
