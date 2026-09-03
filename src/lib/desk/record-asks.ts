import { ASK_ENTITY_TYPES, type AskEntityType } from "@/lib/domain";

export type RecordAskDraft = {
  entityType: AskEntityType;
  entityId: string;
  assigneeId: string;
  body: string;
};

export function parseRecordAsk(input: {
  entityType?: string | null;
  entityId?: string | null;
  assigneeId?: string | null;
  body?: string | null;
}): { ok: true; value: RecordAskDraft } | { ok: false; reason: string } {
  const entityType = (input.entityType ?? "").trim();
  const entityId = (input.entityId ?? "").trim();
  const assigneeId = (input.assigneeId ?? "").trim();
  const body = (input.body ?? "").trim();

  if (!assigneeId) {
    return {
      ok: false,
      reason: "Tag a teammate from the dropdown. Typing a name does not submit.",
    };
  }
  if (!body) {
    return { ok: false, reason: "Ask text is required." };
  }
  if (!(ASK_ENTITY_TYPES as readonly string[]).includes(entityType) || entityType === "commission") {
    return { ok: false, reason: "Ask a teammate is for a Policy, Contact, Lead, Deal, Business, or Carrier." };
  }
  if (!entityId) {
    return { ok: false, reason: "Ask must hang on a record." };
  }
  return {
    ok: true,
    value: {
      entityType: entityType as AskEntityType,
      entityId,
      assigneeId,
      body,
    },
  };
}
