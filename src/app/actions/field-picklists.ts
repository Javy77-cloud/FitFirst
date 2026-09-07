"use server";

import { revalidatePath } from "next/cache";
import {
  createFieldPicklist,
  deleteFieldPicklist,
  updateFieldPicklist,
} from "@/lib/custom-fields/picklist-store";
import { flashAction } from "@/lib/flash-action";
import { isRedirectError } from "@/lib/lifecycle/shop";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionsFrom(form: FormData) {
  return form
    .getAll("options")
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function revalidatePicklists() {
  revalidatePath("/settings/picklists");
  revalidatePath("/settings/field-builder");
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
