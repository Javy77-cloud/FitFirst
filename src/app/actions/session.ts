"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTOR_COOKIE, findUser } from "@/lib/auth/session";

export async function switchActor(formData: FormData) {
  const id = String(formData.get("userId") ?? "").trim();
  const user = id ? await findUser(id) : null;
  if (!user?.active) return;
  const jar = await cookies();
  jar.set(ACTOR_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
}
