/**
 * One-off: hard-delete HealthSherpa webhook/docs sample Policies + related
 * enrollments, alerts, policy_terms, and archived test contacts.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ff-purge-hs-test-policies.mts
 *   DATABASE_URL=... npx tsx scripts/ff-purge-hs-test-policies.mts --apply
 *
 * Never prints the connection string.
 */
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");

const POLICY_IDS = [
  "d1f859f7-d4f8-40f4-a791-21d5087df8e7", // Test Webhook / CONF123
  "fc71ad4b-a390-4e54-ae51-ce16d8ef9552", // Test Enrollment
  "48372684-bdf7-4903-bbf4-77e5213b30d1", // Probe User
  "a180f11d-4f3b-4d27-8008-d33a44653d13", // A B
  "f8bbe215-e945-4e54-8a13-2f77dd6a1c88", // Sample Payload
] as const;

const CONTACT_IDS = [
  "2bba8778-05d9-48b6-82c5-ad0fa5f29ae4",
  "aaa14a8b-de50-433a-a37e-52baf9cad0f1",
  "008360a8-2026-42ac-9532-73c00f442afa",
  "4e91baa0-a5d5-49fa-a816-7209665aea58",
  "ef198e14-1c96-4062-8417-76115a5ae7e3",
] as const;

const PROTECTED_NAMES = ["domenic iori", "rosa castellanos"] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });

  try {
    const listed = await sql`
      SELECT p.id, p.policy_number, p.status, c.first_name, c.last_name
      FROM policies p
      LEFT JOIN contacts c ON c.id = p.contact_id
      WHERE p.id IN ${sql(POLICY_IDS)}
      ORDER BY c.last_name, c.first_name
    `;

    console.log(APPLY ? "APPLY mode" : "DRY-RUN (pass --apply to delete)");
    console.log(`Matched policies: ${listed.length}`);
    for (const row of listed) {
      const name = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
      console.log(`  policy ${row.id}  ${row.policy_number}  [${row.status}]  ${name}`);
    }

    const protectedRows = await sql`
      SELECT p.id, p.policy_number, c.first_name, c.last_name, p.status
      FROM policies p
      JOIN contacts c ON c.id = p.contact_id
      WHERE lower(trim(c.first_name) || ' ' || trim(c.last_name)) IN ${sql(PROTECTED_NAMES)}
    `;
    console.log(`Protected real policies present (must stay): ${protectedRows.length}`);
    for (const row of protectedRows) {
      console.log(`  KEEP ${row.id}  ${row.policy_number}  ${row.first_name} ${row.last_name}`);
    }

    if (!APPLY) {
      console.log("Dry-run complete. No rows deleted.");
      return;
    }

    if (!listed.length) {
      console.log("Nothing to delete.");
      return;
    }

    await sql.begin(async (tx) => {
      const enr = await tx`
        SELECT id FROM healthsherpa_enrollments
        WHERE policy_id IN ${sql(POLICY_IDS)} OR contact_id IN ${sql(CONTACT_IDS)}
      `;
      const enrollmentIds = enr.map((r) => String(r.id));

      const alertDel = enrollmentIds.length
        ? await tx`
            DELETE FROM alerts
            WHERE entity_id IN ${sql(POLICY_IDS)}
               OR entity_id IN ${sql(CONTACT_IDS)}
               OR entity_id IN ${sql(enrollmentIds)}
          `
        : await tx`
            DELETE FROM alerts
            WHERE entity_id IN ${sql(POLICY_IDS)}
               OR entity_id IN ${sql(CONTACT_IDS)}
          `;

      const termsDel = await tx`DELETE FROM policy_terms WHERE policy_id IN ${sql(POLICY_IDS)}`;

      await tx`
        UPDATE healthsherpa_enrollments SET policy_id = NULL
        WHERE policy_id IN ${sql(POLICY_IDS)}
      `;

      const enrDel = enrollmentIds.length
        ? await tx`
            DELETE FROM healthsherpa_enrollments
            WHERE id IN ${sql(enrollmentIds)} OR contact_id IN ${sql(CONTACT_IDS)}
          `
        : await tx`
            DELETE FROM healthsherpa_enrollments
            WHERE contact_id IN ${sql(CONTACT_IDS)}
          `;

      const polDel = await tx`DELETE FROM policies WHERE id IN ${sql(POLICY_IDS)}`;
      const contactDel = await tx`DELETE FROM contacts WHERE id IN ${sql(CONTACT_IDS)}`;

      const stillProtected = await tx`
        SELECT count(*)::int AS n FROM policies p
        JOIN contacts c ON c.id = p.contact_id
        WHERE lower(trim(c.first_name) || ' ' || trim(c.last_name)) IN ${sql(PROTECTED_NAMES)}
      `;
      if (Number(stillProtected[0]?.n ?? 0) < protectedRows.length) {
        throw new Error("Protected policies count dropped — rolling back.");
      }

      const remaining = await tx`SELECT count(*)::int AS n FROM policies WHERE id IN ${sql(POLICY_IDS)}`;
      if (Number(remaining[0]?.n ?? 0) !== 0) {
        throw new Error("Some target policies remain — rolling back.");
      }

      console.log(
        `Deleted: alerts=${alertDel.count} policy_terms=${termsDel.count} enrollments=${enrDel.count} policies=${polDel.count} contacts=${contactDel.count}`,
      );
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
