import type { ReactNode } from "react";
import { ListMassBar, ListSelectionProvider } from "@/components/developer-hub/list-selection";
import { parseMacroKind } from "@/lib/developer-hub/macros";
import { listEnabledMacrosFor, listVisibleButtons } from "@/lib/db/developer-hub-queries";
import { isDevHubModule } from "@/lib/developer-hub/types";
import {
  serializeSelectionRecord,
  type CrmListModule,
  type SelectionRecord,
} from "@/lib/lists/selection-actions";

export async function ModuleListActions({
  module,
  recordIds,
  records = [],
  children,
}: {
  module: CrmListModule;
  recordIds: string[];
  records?: SelectionRecord[];
  children: ReactNode;
}) {
  const [macros, buttons] = isDevHubModule(module)
    ? await Promise.all([
        listEnabledMacrosFor(module),
        listVisibleButtons({ module, placement: ["list", "mass_action"] }),
      ])
    : [[], []];
  return (
    <ListSelectionProvider>
      <div className="px-3 pt-3">
        <ListMassBar
          module={module}
          recordIds={recordIds}
          records={records.map(serializeSelectionRecord)}
          showFollowUp={module === "leads"}
          macros={macros.map((macro) => ({
            id: macro.id,
            name: macro.name,
            kind: parseMacroKind(macro.kind),
          }))}
          buttons={buttons.map((button) => ({
            id: button.id,
            label: button.label,
            actionKind: button.actionKind,
            functionApiName: button.functionApiName,
          }))}
        />
      </div>
      {children}
    </ListSelectionProvider>
  );
}
