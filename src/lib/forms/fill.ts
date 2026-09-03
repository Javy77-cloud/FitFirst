import type { FormFieldDef } from "@/lib/db/schema";
import type { QuoteSheetFieldValue } from "@/lib/domain";

export type FormCell = {
  key: string;
  label: string;
  group: string;
  value: string;
  status: QuoteSheetFieldValue["status"];
  source: string;
};

export function fillFormFromSheet(
  fields: FormFieldDef[],
  sheet: Record<string, QuoteSheetFieldValue> | null,
  extras: {
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    mailing?: string | null;
    dealTitle?: string | null;
    namedInsured?: string | null;
  } = {},
): FormCell[] {
  return fields.map((field) => {
    if (field.sheetKey) {
      const cell = sheet?.[field.sheetKey];
      if (cell?.value?.trim()) {
        return {
          key: field.key,
          label: field.label,
          group: field.group,
          value: cell.value,
          status: cell.status,
          source: cell.source,
        };
      }
      return empty(field);
    }
    if (field.contactKey === "name" && extras.contactName) {
      return confirmed(field, extras.contactName, "contact");
    }
    if (field.contactKey === "email" && extras.contactEmail) {
      return confirmed(field, extras.contactEmail, "contact");
    }
    if (field.contactKey === "phone" && extras.contactPhone) {
      return confirmed(field, extras.contactPhone, "contact");
    }
    if (field.contactKey === "mailing" && extras.mailing) {
      return confirmed(field, extras.mailing, "contact");
    }
    if (field.dealKey === "primaryNamedInsured" && extras.namedInsured) {
      return confirmed(field, extras.namedInsured, "deal");
    }
    if (field.dealKey === "title" && extras.dealTitle) {
      return confirmed(field, extras.dealTitle, "deal");
    }
    return empty(field);
  });
}

export function formCounts(cells: FormCell[]) {
  return {
    missing: cells.filter((c) => c.status === "missing").length,
    check: cells.filter((c) => c.status === "check").length,
    confirmed: cells.filter((c) => c.status === "confirmed").length,
  };
}

function empty(field: FormFieldDef): FormCell {
  return {
    key: field.key,
    label: field.label,
    group: field.group,
    value: "",
    status: "missing",
    source: "blank",
  };
}

function confirmed(field: FormFieldDef, value: string, source: string): FormCell {
  return {
    key: field.key,
    label: field.label,
    group: field.group,
    value,
    status: "confirmed",
    source,
  };
}
