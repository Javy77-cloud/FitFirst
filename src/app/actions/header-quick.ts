"use server";

import { redirect } from "next/navigation";
import { logDeskActivity } from "@/app/actions/activities-desk";

export async function createHeaderMeeting(formData: FormData) {
  formData.set("kind", "meeting");
  await logDeskActivity(formData);
  redirect("/calendar");
}

export async function createHeaderCall(formData: FormData) {
  formData.set("kind", "call");
  await logDeskActivity(formData);
  redirect("/calendar");
}
