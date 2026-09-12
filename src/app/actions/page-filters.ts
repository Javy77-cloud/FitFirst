"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth/guards";
import {
  defaultPageFilters,
  normalizePageFilterModule,
  resolvePageFilters,
  type PageFilter,
} from "@/lib/page-filters";
import { loadPageFilterPrefs, savePageFilterPrefs } from "@/lib/page-filters/store";

const MODULE_PATHS: Record<string, string[]> = {
  contacts: ["/contacts"],
  businesses: ["/accounts", "/businesses"],
  policies: ["/policies"],
  carriers: ["/carriers"],
};

export async function fetchPageFilterPrefs(moduleId: string): Promise<PageFilter[]> {
  return loadPageFilterPrefs(moduleId);
}

export async function saveAgencyPageFilters(moduleId: string, filters: PageFilter[]): Promise<PageFilter[]> {
  await requireAdminAction();
  const module = normalizePageFilterModule(moduleId);
  if (!module) throw new Error("Unknown page-filter module.");
  const next = await savePageFilterPrefs(module, resolvePageFilters(module, filters));
  for (const path of MODULE_PATHS[module] ?? []) {
    revalidatePath(path);
  }
  return next;
}

export async function resetAgencyPageFilters(moduleId: string): Promise<PageFilter[]> {
  await requireAdminAction();
  const module = normalizePageFilterModule(moduleId);
  if (!module) throw new Error("Unknown page-filter module.");
  return saveAgencyPageFilters(module, defaultPageFilters(module));
}
