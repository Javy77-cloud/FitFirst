"use client";

import { useEffect } from "react";
import { writeListOrder, type RecordListModule } from "@/lib/desk/record-list-order";

/** Writes the visible list order to sessionStorage when the list page mounts/updates. */
export function PersistListOrder({
  module,
  ids,
}: {
  module: RecordListModule;
  ids: readonly string[];
}) {
  useEffect(() => {
    writeListOrder(module, ids);
  }, [module, ids]);

  return null;
}
