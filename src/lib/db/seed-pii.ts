import { eq } from "drizzle-orm";
import { db } from "./index";
import { accounts, contacts, drivers } from "./schema";
import { writeEin, writeLicense, writeSsn } from "@/lib/pii/write";
import { ELENA_CONTACT_ID } from "../fixtures/ids";

/** Encrypt leftover plaintext EIN / DL and seed Elena's fake SSN. Never writes plaintext. */
export async function seedPiiVault() {
  const accountRows = await db.select().from(accounts);
  for (const row of accountRows) {
    if (row.ein && !row.einEnc) {
      await db.update(accounts).set({ ...writeEin(row.ein), updatedAt: new Date() }).where(eq(accounts.id, row.id));
    } else if (row.ein && row.einEnc) {
      await db.update(accounts).set({ ein: null, updatedAt: new Date() }).where(eq(accounts.id, row.id));
    }
  }

  const driverRows = await db.select().from(drivers);
  for (const row of driverRows) {
    if (row.licenseNumber && !row.licenseNumberEnc) {
      await db
        .update(drivers)
        .set({ ...writeLicense(row.licenseNumber), updatedAt: new Date() })
        .where(eq(drivers.id, row.id));
    } else if (row.licenseNumber && row.licenseNumberEnc) {
      await db.update(drivers).set({ licenseNumber: null, updatedAt: new Date() }).where(eq(drivers.id, row.id));
    }
  }

  const [elena] = await db.select().from(contacts).where(eq(contacts.id, ELENA_CONTACT_ID));
  if (elena && !elena.ssnEnc) {
    await db
      .update(contacts)
      .set({ ...writeSsn("000-00-4444"), updatedAt: new Date() })
      .where(eq(contacts.id, ELENA_CONTACT_ID));
  }
}
