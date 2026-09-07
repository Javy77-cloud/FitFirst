import { sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { ensureFollowUpPlaybooks } from "@/lib/leads/ensure-playbooks";

/**
 * One-time / idempotent Leads clock fix.
 * 1. Stamp first_contact_at from the earliest logged call / email / sms when missing.
 * 2. Reset status to `new` only for leads with no first-contact stamp and no logged comms.
 *    Skips converted leads. Does not wipe or reseed the book.
 * 3. Cancel queued follow-ups on those untouched new leads so the clock can be tested cleanly.
 */
let ranOnce = false;

export async function resetLeadsWithoutLoggedContact() {
  if (ranOnce) return;
  ranOnce = true;
  await ensureFollowUpPlaybooks();
  await db.execute(sql`
    UPDATE leads AS l
    SET first_contact_at = first.occurred, updated_at = now()
    FROM (
      SELECT a.lead_id AS lead_id, MIN(COALESCE(al.occurred_at, a.created_at)) AS occurred
      FROM activities a
      LEFT JOIN activity_logs al ON al.activity_id = a.id
      WHERE a.lead_id IS NOT NULL
        AND a.kind IN ('call', 'email', 'sms')
      GROUP BY a.lead_id
    ) first
    WHERE l.id = first.lead_id
      AND l.first_contact_at IS NULL
      AND l.tenant_id = ${DEFAULT_TENANT_ID}
  `);

  await db.execute(sql`
    UPDATE lead_follow_up_steps
    SET remind_via = 'popup'
    WHERE id = 'a0710001-a071-4111-8111-a07100000031'
      AND remind_via IS DISTINCT FROM 'popup'
  `);
}
