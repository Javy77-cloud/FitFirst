"use server";

import { revalidatePath } from "next/cache";
import {
  createFieldPicklist,
  deleteFieldPicklist,
  getFieldPicklist,
  updateFieldPicklist,
} from "@/lib/custom-fields/picklist-store";
import {
  clearAllPicklistOptionColors,
  sanitizeRichPicklistOptions,
  type PicklistOption,
} from "@/lib/custom-fields/picklists";
import { isRedirectError } from "@/lib/lifecycle/shop";
import { STATUS_COLOR_KEYS } from "@/lib/desk/status-colors";
import { listMutationError, listMutationOk, type ListMutationResult } from "@/lib/settings/list-editor";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionsFrom(form: FormData): PicklistOption[] {
  const values = form.getAll("options").map((item) => String(item));
  const colors = form.getAll("optionColors").map((item) => String(item));
  const defaultRaw = str(form, "defaultIndex");
  const defaultIndex = defaultRaw === "" ? -1 : Number(defaultRaw);
  const raw: PicklistOption[] = [];
  for (let i = 0; i < values.length; i++) {
    const value = values[i]?.trim() ?? "";
    if (!value) continue;
    const colorRaw = (colors[i]?.trim() ?? "").toLowerCase();
    const color =
      colorRaw && colorRaw !== "none" && (STATUS_COLOR_KEYS as readonly string[]).includes(colorRaw)
        ? (colorRaw as PicklistOption["color"])
        : null;
    raw.push({
      value,
      color,
      isDefault: Number.isFinite(defaultIndex) && defaultIndex === i,
    });
  }
  return sanitizeRichPicklistOptions(raw);
}

function revalidatePicklists() {
  revalidatePath("/settings/picklists");
  revalidatePath("/settings/field-builder");
  revalidatePath("/deals");
}

function fail(error: unknown, fallback: string): ListMutationResult {
  if (isRedirectError(error)) throw error;
  const message = error instanceof Error ? error.message : fallback;
  return listMutationError(message);
}

export async function saveFieldPicklist(formData: FormData): Promise<ListMutationResult> {
  const id = str(formData, "id");
  const name = str(formData, "name") || "Untitled list";
  const options = optionsFrom(formData);
  try {
    if (id) await updateFieldPicklist(id, { name, options });
    else await createFieldPicklist(name, options);
    revalidatePicklists();
    return listMutationOk("pick-list-saved");
  } catch (error) {
    return fail(error, "Could not save picklist.");
  }
}

export async function createEmptyFieldPicklist(formData: FormData): Promise<ListMutationResult> {
  const name = str(formData, "name") || "New picklist";
  try {
    await createFieldPicklist(name, []);
    revalidatePicklists();
    return listMutationOk("pick-list-saved");
  } catch (error) {
    return fail(error, "Could not create picklist.");
  }
}

export async function deleteFieldPicklistAction(formData: FormData): Promise<ListMutationResult> {
  const id = str(formData, "id");
  if (!id) return listMutationError("Picklist not found.");
  try {
    await deleteFieldPicklist(id);
    revalidatePicklists();
    return listMutationOk("list-deleted");
  } catch (error) {
    return fail(error, "Could not delete picklist.");
  }
}

export async function removeFieldPicklistOption(formData: FormData): Promise<ListMutationResult> {
  const id = str(formData, "id");
  const value = str(formData, "value");
  if (!id || !value) return listMutationError("Picklist not found.");
  try {
    const existing = await getFieldPicklist(id);
    if (!existing) {
      return listMutationError("Picklist not found.");
    }
    const next = existing.options.filter((option) => option.value !== value);
    await updateFieldPicklist(id, { options: next });
    revalidatePicklists();
    return listMutationOk("list-item-deleted");
  } catch (error) {
    return fail(error, "Could not delete value.");
  }
}

export async function clearFieldPicklistColors(formData: FormData): Promise<ListMutationResult> {
  const id = str(formData, "id");
  if (!id) return listMutationError("Picklist not found.");
  try {
    const existing = await getFieldPicklist(id);
    if (!existing) {
      return listMutationError("Picklist not found.");
    }
    const next = clearAllPicklistOptionColors(existing.options);
    await updateFieldPicklist(id, { options: next });
    revalidatePicklists();
    return listMutationOk("colors-cleared");
  } catch (error) {
    return fail(error, "Could not clear colors.");
  }
}
