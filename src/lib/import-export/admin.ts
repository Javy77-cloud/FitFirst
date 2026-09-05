import { NextResponse } from "next/server";
import { currentDeskSession, getActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";
import type { JobActor } from "./types";

export async function requireImportAdmin(): Promise<
  { ok: true; actor: JobActor } | { ok: false; response: NextResponse }
> {
  const session = await currentDeskSession();
  const actor = await getActor();
  if (!session.signedIn || !session.isAdmin || !isAdmin(actor)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Admin only." }, { status: 403 }),
    };
  }
  return {
    ok: true,
    actor: {
      id: session.userId,
      name: session.name,
      email: session.email,
    },
  };
}

export function csvResponse(filename: string, body: string, contentType = "text/csv; charset=utf-8") {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
