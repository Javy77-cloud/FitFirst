import type { ReactNode } from "react";
import { ListMassBar, ListSelectionProvider } from "@/components/developer-hub/list-selection";
import { parseMacroKind } from "@/lib/developer-hub/macros";
import { listEnabledMacrosFor, listVisibleButtons } from "@/lib/db/developer-hub-queries";
import { listFollowUpTemplates } from "@/lib/db/lead-follow-up-queries";
import { listUsers } from "@/lib/db/queries";
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
  showMacrosLink = true,
  showFollowUp,
}: {
  module: CrmListModule;
  recordIds: string[];
  records?: SelectionRecord[];
  children: ReactNode;
  showMacrosLink?: boolean;
  showFollowUp?: boolean;
}) {
  const [macros, buttons, userRows, templateRows] = await Promise.all([
    isDevHubModule(module) ? listEnabledMacrosFor(module) : Promise.resolve([]),
    isDevHubModule(module)
      ? listVisibleButtons({ module, placement: ["list", "mass_action"] })
      : Promise.resolve([]),
    listUsers(),
    listFollowUpTemplates().catch(() => []),
  ]);
  return (
    <ListSelectionProvider>
      <div className="px-3 pt-3">
        <ListMassBar
          module={module}
          recordIds={recordIds}
          records={records.map(serializeSelectionRecord)}
          owners={userRows.map((user) => ({ id: user.id, name: user.name }))}
          templates={templateRows.map((row) => ({ id: row.id, name: row.name }))}
          showFollowUp={showFollowUp ?? module === "leads"}
          showMacrosLink={showMacrosLink}
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
