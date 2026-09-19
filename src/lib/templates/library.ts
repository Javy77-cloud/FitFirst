import type { EmailTemplate } from "@/lib/db/schema";

export type TemplateLocaleReady = {
  enReady: boolean;
  esReady: boolean;
  subjectEn: string;
  bodyEn: string;
  subjectEs: string;
  bodyEs: string;
  sends: false;
};

/** EN/ES preview copy. Missing locale falls back so the library always has a structure. */
export function templateLocaleCopy(template: {
  subject?: string | null;
  body?: string | null;
  subjectEn?: string | null;
  bodyEn?: string | null;
  subjectEs?: string | null;
  bodyEs?: string | null;
}): TemplateLocaleReady {
  const subjectEn = (template.subjectEn ?? template.subject ?? "").trim();
  const bodyEn = (template.bodyEn ?? template.body ?? "").trim();
  const subjectEs = (template.subjectEs ?? "").trim();
  const bodyEs = (template.bodyEs ?? "").trim();
  return {
    enReady: Boolean(subjectEn && bodyEn),
    esReady: Boolean(subjectEs && bodyEs),
    subjectEn,
    bodyEn,
    subjectEs,
    bodyEs,
    sends: false,
  };
}

export function templateLanguageLabel(ready: TemplateLocaleReady): string {
  if (ready.enReady && ready.esReady) return "EN + ES ready";
  if (ready.enReady) return "EN ready · ES missing";
  if (ready.esReady) return "ES ready · EN missing";
  return "Copy missing";
}

export function isWorkEmailTemplate(template: Pick<EmailTemplate, "slug" | "kind">): boolean {
  return Boolean(template.slug || template.kind);
}

const SYSTEM_KINDS = new Set(["google_review", "checkin_4mo", "renewal_awareness"]);

export function isSystemEmailTemplate(template: {
  kind?: string | null;
  isSeeded?: boolean | null;
  slug?: string | null;
}): boolean {
  if (template.kind === "custom") return false;
  if (template.kind && SYSTEM_KINDS.has(template.kind)) return true;
  return Boolean(template.isSeeded);
}

export function partitionEmailTemplates<T extends { kind?: string | null; isSeeded?: boolean | null; slug?: string | null }>(
  templates: T[],
): { system: T[]; custom: T[] } {
  const system: T[] = [];
  const custom: T[] = [];
  for (const template of templates) {
    if (isSystemEmailTemplate(template)) system.push(template);
    else custom.push(template);
  }
  return { system, custom };
}
