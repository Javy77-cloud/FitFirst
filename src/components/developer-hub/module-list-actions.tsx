import type { ReactNode } from "react";
import { ListMassBar, ListSelectionProvider } from "@/components/developer-hub/list-selection";
import { parseMacroKind } from "@/lib/developer-hub/macros";
import { listEnabledMacrosFor, listVisibleButtons } from "@/lib/db/developer-hub-queries";
import type { DevHubModule } from "@/lib/developer-hub/types";

export async function ModuleListActions({
  module,
  recordIds,
  children,
}: {
  module: DevHubModule;
  recordIds: string[];
  children: ReactNode;
}) {
  const [macros, buttons] = await Promise.all([
    listEnabledMacrosFor(module),
    listVisibleButtons({ module, placement: ["list", "mass_action"] }),
  ]);
  return (
    <ListSelectionProvider>
      <div className="px-3 pt-3">
        <ListMassBar
          module={module}
          recordIds={recordIds}
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
