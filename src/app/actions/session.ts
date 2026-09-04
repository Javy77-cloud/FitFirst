"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTOR_COOKIE, currentDeskSession, findUser } from "@/lib/auth/session";

export async function switchActor(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.isAdmin) return;
  const id = String(formData.get("userId") ?? "").trim();
  const user = id ? await findUser(id) : null;
  if (!user?.active) return;
  const jar = await cookies();
  jar.set({
    name: ACTOR_COOKIE,
    value: user.id,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
  revalidatePath("/commissions");
  revalidatePath("/contacts");
  revalidatePath("/deals");
  revalidatePath("/leads");
  revalidatePath("/policies");
}
