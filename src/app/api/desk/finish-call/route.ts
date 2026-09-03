import { NextResponse } from "next/server";
import { saveCallOutcome } from "@/app/actions/activities";

export async function POST(request: Request) {
  const form = await request.formData();
  try {
    const result = await saveCallOutcome(form);
    return NextResponse.redirect(new URL(result.returnTo, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the call.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
