import { ensureDefaultGlobalLists } from "./global-lists";

export async function seedGlobalLists() {
  await ensureDefaultGlobalLists();
}
