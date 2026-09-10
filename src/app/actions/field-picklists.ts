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
import { flashAction } from "@/lib/flash-action";
import { isRedirectError } from "@/lib/lifecycle/shop";
import { STATUS_COLOR_KEYS } from "@/lib/desk/status-colors";

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

export async function saveFieldPicklist(formData: FormData) {
  const id = str(formData, "id");
  const name = str(formData, "name") || "Untitled list";
  const options = optionsFrom(formData);
  try {
    if (id) await updateFieldPicklist(id, { name, options });
    else await createFieldPicklist(name, options);
    revalidatePicklists();
    flashAction("/settings/picklists", "list-saved");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not save picklist.";
    flashAction("/settings/picklists", message, "error");
  }
}

export async function createEmptyFieldPicklist(formData: FormData) {
  const name = str(formData, "name") || "New picklist";
  try {
    await createFieldPicklist(name, []);
    revalidatePicklists();
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not create picklist.";
    flashAction("/settings/picklists", message, "error");
  }
}

export async function deleteFieldPicklistAction(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  try {
    await deleteFieldPicklist(id);
    revalidatePicklists();
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not delete picklist.";
    flashAction("/settings/picklists", message, "error");
  }
}

export async function removeFieldPicklistOption(formData: FormData) {
  const id = str(formData, "id");
  const value = str(formData, "value");
  if (!id || !value) return;
  try {
    const existing = await getFieldPicklist(id);
    if (!existing) {
      flashAction("/settings/picklists", "Picklist not found.", "error");
      return;
    }
    const next = existing.options.filter((option) => option.value !== value);
    await updateFieldPicklist(id, { options: next });
    revalidatePicklists();
    flashAction("/settings/picklists", "list-item-deleted");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not delete value.";
    flashAction("/settings/picklists", message, "error");
  }
}

export async function clearFieldPicklistColors(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  try {
    const existing = await getFieldPicklist(id);
    if (!existing) {
      flashAction("/settings/picklists", "Picklist not found.", "error");
      return;
    }
    const next = clearAllPicklistOptionColors(existing.options);
    await updateFieldPicklist(id, { options: next });
    revalidatePicklists();
    flashAction("/settings/picklists", "colors-cleared");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not clear colors.";
    flashAction("/settings/picklists", message, "error");
  }
}
