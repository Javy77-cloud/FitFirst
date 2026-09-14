import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deskFieldLayouts } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { parseLayout } from "../src/lib/custom-fields/types";

/** Right-rail stub Co-Applicant that reused primary contact keys — causes delete/move chaos. */
function isStubCoApplicant(section: { id: string; label: string; fieldKeys: string[] }): boolean {
  const labelHit = /^co[- ]?applicant/i.test(section.label.trim());
  if (!labelHit && section.id !== "co_applicant") return false;
  // Real co-applicant uses co_applicant_* keys. Stub reused first_name/email/phone.
  const hasPrimary = section.fieldKeys.some((k) =>
    ["first_name", "last_name", "email", "phone", "date_of_birth"].includes(k),
  );
  const hasCoKeys = section.fieldKeys.some((k) => k.startsWith("co_applicant_"));
  return hasPrimary && !hasCoKeys;
}

async function main() {
  const rows = await db
    .select()
    .from(deskFieldLayouts)
    .where(and(eq(deskFieldLayouts.tenantId, DEFAULT_TENANT_ID), eq(deskFieldLayouts.module, "deals")));

  for (const row of rows) {
    const layout = parseLayout(row.columns);
    let changed = false;
    for (const col of layout.columns) {
      const before = col.sections.length;
      col.sections = col.sections.filter((s) => !isStubCoApplicant(s));
      if (col.sections.length !== before) changed = true;
    }
    // Ensure left co_applicant keeps marital status
    for (const col of layout.columns) {
      for (const s of col.sections) {
        if (s.id !== "co_applicant" && !/^co[- ]?applicant$/i.test(s.label.trim())) continue;
        if (s.fieldKeys.some((k) => k.startsWith("co_applicant_")) && !s.fieldKeys.includes("co_applicant_marital_status")) {
          const after = s.fieldKeys.indexOf("co_applicant_relationship_to_insured");
          if (after >= 0) s.fieldKeys.splice(after + 1, 0, "co_applicant_marital_status");
          else s.fieldKeys.push("co_applicant_marital_status");
          changed = true;
        }
      }
    }
    if (changed) {
      await db
        .update(deskFieldLayouts)
        .set({ columns: layout, updatedAt: new Date() })
        .where(eq(deskFieldLayouts.id, row.id));
      console.log("cleaned", row.lineOfBusiness);
    } else {
      console.log("ok", row.lineOfBusiness);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
