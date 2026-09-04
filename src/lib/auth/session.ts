import { ADMIN_NAME, ADMIN_USER_ID } from "@/lib/fixtures/ids";

export type DeskActor = {
  id: string;
  name: string;
  role: "admin" | "agent";
};

/** Single-tenant overnight desk — no live login. */
export async function currentDeskSession(): Promise<DeskActor> {
  return {
    id: ADMIN_USER_ID,
    name: ADMIN_NAME,
    role: "admin",
  };
}

export async function getActor(): Promise<DeskActor> {
  return currentDeskSession();
}

export function isAdmin(actor: { role: string } | null | undefined): boolean {
  return actor?.role === "admin";
}
