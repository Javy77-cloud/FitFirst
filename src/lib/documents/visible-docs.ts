import { ne, type SQL } from "drizzle-orm";
import { documents } from "@/lib/db/schema";

/** Drop user-hidden files from lists, tabs, fills, and “file is on the record” checks. */
export function notHiddenDocument(): SQL {
  return ne(documents.status, "hidden");
}
