import { panemtPasreizejoLietotaju } from "@/lib/auth";
import { redirect } from "next/navigation";
import SwipeClient from "./SwipeClient";

export default async function SwipePage() {
	const lietotajs = await panemtPasreizejoLietotaju();

	if (!lietotajs) {
		redirect("/login");
	}

	return <SwipeClient lietotajs={lietotajs} />;
}
