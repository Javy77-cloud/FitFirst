"use server";

import { switchDeskRole } from "@/lib/auth/switch-role";

export async function switchActor(formData: FormData) {
  const id = String(formData.get("userId") ?? "").trim();
  await switchDeskRole(id);
}
