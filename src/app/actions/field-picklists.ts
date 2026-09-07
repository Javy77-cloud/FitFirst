"use server";

import { revalidatePath } from "next/cache";
import {
  createFieldPicklist,
  deleteFieldPicklist,
  updateFieldPicklist,
} from "@/lib/custom-fields/picklist-store";
import { flashAction } from "@/lib/flash-action";

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
  if (id) await updateFieldPicklist(id, { name, options });
  else await createFieldPicklist(name, options);
  revalidatePicklists();
  flashAction("/settings/picklists", "list-saved");
}

export async function createEmptyFieldPicklist(formData: FormData) {
  const name = str(formData, "name") || "New picklist";
  await createFieldPicklist(name, []);
  revalidatePicklists();
}

export async function deleteFieldPicklistAction(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await deleteFieldPicklist(id);
  revalidatePicklists();
}
