"use server";

import { redirect } from "next/navigation";
import { logDeskActivity } from "@/app/actions/activities-desk";
import { flashAction } from "@/lib/flash-action";

export async function createHeaderMeeting(formData: FormData) {
  formData.set("kind", "meeting");
  await logDeskActivity(formData);
  flashAction("/calendar", "meeting-saved");
}

export async function createHeaderCall(formData: FormData) {
  formData.set("kind", "call");
  await logDeskActivity(formData);
  redirect("/calendar");
}
