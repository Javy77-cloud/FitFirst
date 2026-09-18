import { isCustomFieldType, type CustomFieldType } from "./types";

const PERSON_NAME_KEY = /(^|_)((first|middle|last)_name)$/;
const EMAIL_KEY = /(^|_)email$/;
const PERSON_NAME_LABEL = /^(first|middle|last)\s+name$/i;

export function isPersonNameField(field: { key: string; label?: string | null }): boolean {
  if (PERSON_NAME_KEY.test(field.key)) return true;
  return PERSON_NAME_LABEL.test((field.label ?? "").trim());
}

export function isEmailFieldKey(key: string): boolean {
  return EMAIL_KEY.test(key);
}

/** Email HTML type is allowed only on an actual email field — never a personal name. */
export function isEmailField(field: { key: string; type?: string; label?: string | null }): boolean {
  if (isPersonNameField(field)) return false;
  if (isEmailFieldKey(field.key)) return true;
  return field.type === "email";
}

export function canonicalFieldType(
  key: string,
  type: CustomFieldType,
  label?: string | null,
): CustomFieldType {
  if (isPersonNameField({ key, label })) {
    return type === "email" || type === "phone" ? "single_line" : type;
  }
  if (isEmailFieldKey(key)) return "email";
  return type;
}

export function canonicalizeIdentityField<
  T extends { key: string; type: CustomFieldType; label?: string | null },
>(field: T): T {
  const type = canonicalFieldType(field.key, field.type, field.label);
  return type === field.type ? field : { ...field, type };
}

export function htmlInputTypeForField(field: {
  key: string;
  type: string;
  label?: string | null;
}): string {
  if (isPersonNameField(field)) return "text";
  if (isEmailField(field)) return "email";
  if (field.type === "dob") return "text";
  if (field.type === "date") return "date";
  if (field.type === "date_time") return "datetime-local";
  if (field.type === "number") return "number";
  return "text";
}

export function htmlAutoCompleteForField(field: {
  key: string;
  label?: string | null;
}): string | undefined {
  const key = field.key;
  const label = field.label ?? "";
  if (key === "middle_name" || key.endsWith("_middle_name") || /middle\s+name/i.test(label)) {
    return "additional-name";
  }
  if (key === "first_name" || key.endsWith("_first_name") || /first\s+name/i.test(label)) {
    return "given-name";
  }
  if (key === "last_name" || key.endsWith("_last_name") || /last\s+name/i.test(label)) {
    return "family-name";
  }
  if (isEmailFieldKey(key)) return "email";
  return undefined;
}

export function identityTypeNeedsRepair(
  key: string,
  storedType: string,
  label?: string | null,
): boolean {
  if (!isCustomFieldType(storedType)) return false;
  return canonicalFieldType(key, storedType, label) !== storedType;
}
