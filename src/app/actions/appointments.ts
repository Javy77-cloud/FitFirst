"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, SELLING_AGENCIES, type SellingAgency } from "@/lib/domain";
import { db } from "@/lib/db";
import { carrierAppointments } from "@/lib/db/schema";
import { flashAction } from "@/lib/flash-action";

export async function updateCarrierAppointment(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const appointed = String(formData.get("appointed") ?? "") === "true";
  const sellingAgency = String(formData.get("sellingAgency") ?? "") as SellingAgency;
  if (!id) return;
  if (!SELLING_AGENCIES.includes(sellingAgency)) return;

  await db
    .update(carrierAppointments)
    .set({
      appointed,
      sellingAgency,
      updatedAt: new Date(),
    })
    .where(and(eq(carrierAppointments.id, id), eq(carrierAppointments.tenantId, DEFAULT_TENANT_ID)));

  revalidatePath("/carriers");
  flashAction("/carriers", "Appointment saved");
}
