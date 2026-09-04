"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";

export async function updateContactTags(formData: FormData) {
  const id = String(formData.get("contactId") ?? "");
  const tags = String(formData.get("tags") ?? "")
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  await db
    .update(contacts)
    .set({ tags, updatedAt: new Date() })
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, id)));
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/campaigns");
}
