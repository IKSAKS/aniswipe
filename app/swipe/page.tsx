import { panemtPasreizejaisLietotajs } from "@/lib/auth";
import { redirect } from "next/navigation";
import SwipeClient from "./SwipeClient";

export default async function SwipePage() {
	const lietotajs = await panemtPasreizejaisLietotajs();

	if (!lietotajs) {
		redirect("/login");
	}

	return <SwipeClient lietotajs={lietotajs} />;
}
