import { sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  FOLLOW_UP_TEMPLATE_COLD_ID,
  FOLLOW_UP_TEMPLATE_DEFAULT_ID,
  FOLLOW_UP_TEMPLATE_HOT_ID,
  FOLLOW_UP_TEMPLATE_WARM_ID,
} from "@/lib/fixtures/ids";

let ensured = false;

const DEFAULT_STEPS = [
  {
    id: "a0710001-a071-4111-8111-a07100000031",
    sort: 0,
    method: "call",
    amount: 5,
    unit: "minutes",
    message: "Call this lead now.",
    remind: "popup",
  },
  {
    id: "a0710001-a071-4111-8111-a07100000032",
    sort: 1,
    method: "text",
    amount: 30,
    unit: "minutes",
    message: "Text if the first call missed.",
    remind: "task",
  },
  {
    id: "a0710001-a071-4111-8111-a07100000033",
    sort: 2,
    method: "email",
    amount: 2,
    unit: "hours",
    message: "Email a same-day intro if we have not connected.",
    remind: "task",
  },
  {
    id: "a0710001-a071-4111-8111-a07100000034",
    sort: 3,
    method: "call",
    amount: 1,
    unit: "days",
    message: "Second call the next day.",
    remind: "task",
  },
] as const;

/** Idempotent. Inserts missing Aggressive / Steady / Drip / Default playbooks. Never wipes. */
export async function ensureFollowUpPlaybooks() {
  if (ensured) return;
  await db.execute(sql`
    INSERT INTO lead_follow_up_templates (id, tenant_id, name, trigger_status, enabled)
    SELECT ${FOLLOW_UP_TEMPLATE_HOT_ID}::uuid, ${DEFAULT_TENANT_ID}::uuid, 'Aggressive', 'new', true
    WHERE EXISTS (SELECT 1 FROM tenants WHERE id = ${DEFAULT_TENANT_ID}::uuid)
      AND NOT EXISTS (SELECT 1 FROM lead_follow_up_templates WHERE id = ${FOLLOW_UP_TEMPLATE_HOT_ID}::uuid)
  `);
  await db.execute(sql`
    INSERT INTO lead_follow_up_templates (id, tenant_id, name, trigger_status, enabled)
    SELECT ${FOLLOW_UP_TEMPLATE_WARM_ID}::uuid, ${DEFAULT_TENANT_ID}::uuid, 'Steady', 'warm', true
    WHERE EXISTS (SELECT 1 FROM tenants WHERE id = ${DEFAULT_TENANT_ID}::uuid)
      AND NOT EXISTS (SELECT 1 FROM lead_follow_up_templates WHERE id = ${FOLLOW_UP_TEMPLATE_WARM_ID}::uuid)
  `);
  await db.execute(sql`
    INSERT INTO lead_follow_up_templates (id, tenant_id, name, trigger_status, enabled)
    SELECT ${FOLLOW_UP_TEMPLATE_COLD_ID}::uuid, ${DEFAULT_TENANT_ID}::uuid, 'Drip', 'cold', true
    WHERE EXISTS (SELECT 1 FROM tenants WHERE id = ${DEFAULT_TENANT_ID}::uuid)
      AND NOT EXISTS (SELECT 1 FROM lead_follow_up_templates WHERE id = ${FOLLOW_UP_TEMPLATE_COLD_ID}::uuid)
  `);
  await db.execute(sql`
    INSERT INTO lead_follow_up_templates (id, tenant_id, name, trigger_status, enabled)
    SELECT ${FOLLOW_UP_TEMPLATE_DEFAULT_ID}::uuid, ${DEFAULT_TENANT_ID}::uuid, 'Default', 'contacted', true
    WHERE EXISTS (SELECT 1 FROM tenants WHERE id = ${DEFAULT_TENANT_ID}::uuid)
      AND NOT EXISTS (SELECT 1 FROM lead_follow_up_templates WHERE id = ${FOLLOW_UP_TEMPLATE_DEFAULT_ID}::uuid)
  `);
  await db.execute(sql`
    UPDATE lead_follow_up_templates
    SET trigger_status = 'contacted', name = 'Default', updated_at = now()
    WHERE id = ${FOLLOW_UP_TEMPLATE_DEFAULT_ID}::uuid
      AND (trigger_status IN ('default', 'new') OR lower(name) = 'default')
  `);
  for (const step of DEFAULT_STEPS) {
    await db.execute(sql`
      INSERT INTO lead_follow_up_steps (
        id, tenant_id, template_id, sort_order, method, delay_amount, delay_unit, message, remind_via
      )
      SELECT ${step.id}::uuid, ${DEFAULT_TENANT_ID}::uuid, ${FOLLOW_UP_TEMPLATE_DEFAULT_ID}::uuid,
        ${step.sort}, ${step.method}, ${step.amount}, ${step.unit}, ${step.message}, ${step.remind}
      WHERE EXISTS (SELECT 1 FROM lead_follow_up_templates WHERE id = ${FOLLOW_UP_TEMPLATE_DEFAULT_ID}::uuid)
        AND NOT EXISTS (SELECT 1 FROM lead_follow_up_steps WHERE id = ${step.id}::uuid)
    `);
  }
  await db.execute(sql`
    UPDATE lead_follow_up_steps
    SET remind_via = 'popup'
    WHERE id = 'a0710001-a071-4111-8111-a07100000031'
      AND remind_via IS DISTINCT FROM 'popup'
  `);
  const aggressive = [
    {
      id: "a0710001-a071-4111-8111-a07100000011",
      sort: 0,
      method: "call",
      amount: 5,
      unit: "minutes",
      message: "Call this hot lead now.",
      remind: "popup",
    },
    {
      id: "a0710001-a071-4111-8111-a07100000012",
      sort: 1,
      method: "text",
      amount: 30,
      unit: "minutes",
      message: "Text if the first call missed.",
      remind: "task",
    },
    {
      id: "a0710001-a071-4111-8111-a07100000013",
      sort: 2,
      method: "email",
      amount: 2,
      unit: "hours",
      message: "Email a same-day intro if we have not connected.",
      remind: "task",
    },
    {
      id: "a0710001-a071-4111-8111-a07100000014",
      sort: 3,
      method: "call",
      amount: 1,
      unit: "days",
      message: "Second call the next day.",
      remind: "task",
    },
  ] as const;
  for (const step of aggressive) {
    await db.execute(sql`
      INSERT INTO lead_follow_up_steps (
        id, tenant_id, template_id, sort_order, method, delay_amount, delay_unit, message, remind_via
      )
      SELECT ${step.id}::uuid, ${DEFAULT_TENANT_ID}::uuid, ${FOLLOW_UP_TEMPLATE_HOT_ID}::uuid,
        ${step.sort}, ${step.method}, ${step.amount}, ${step.unit}, ${step.message}, ${step.remind}
      WHERE EXISTS (SELECT 1 FROM lead_follow_up_templates WHERE id = ${FOLLOW_UP_TEMPLATE_HOT_ID}::uuid)
        AND NOT EXISTS (SELECT 1 FROM lead_follow_up_steps WHERE id = ${step.id}::uuid)
    `);
  }
  ensured = true;
}
