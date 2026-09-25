import type { ReactNode } from "react";
import { ListMassBar, ListSelectionProvider } from "@/components/developer-hub/list-selection";
import { parseMacroKind } from "@/lib/developer-hub/macros";
import { listEnabledMacrosFor, listVisibleButtons } from "@/lib/db/developer-hub-queries";
import { listFollowUpTemplates } from "@/lib/db/lead-follow-up-queries";
import { listUsers } from "@/lib/db/queries";
import { isDevHubModule } from "@/lib/developer-hub/types";
import { isFieldLayoutModule } from "@/lib/custom-fields/modules";
import { listFieldDefs } from "@/lib/custom-fields/store";
import {
  serializeSelectionRecord,
  type CrmListModule,
  type SelectionRecord,
} from "@/lib/lists/selection-actions";
import { listModuleTags } from "@/app/actions/record-tags";
import { tagModuleForCrmList } from "@/lib/lists/list-bulk";

export async function ModuleListActions({
  module,
  recordIds,
  records = [],
  children,
  showMacrosLink = true,
  showFollowUp,
  afterCheck = null,
  afterActions = null,
  end = null,
  hideSelectionCue = false,
}: {
  module: CrmListModule;
  recordIds: string[];
  records?: SelectionRecord[];
  children: ReactNode;
  showMacrosLink?: boolean;
  showFollowUp?: boolean;
  afterCheck?: ReactNode;
  afterActions?: ReactNode;
  end?: ReactNode;
  hideSelectionCue?: boolean;
}) {
  const tagModule = tagModuleForCrmList(module);
  const [macros, buttons, userRows, templateRows, fieldDefs, tagCatalog] = await Promise.all([
    isDevHubModule(module) ? listEnabledMacrosFor(module) : Promise.resolve([]),
    isDevHubModule(module)
      ? listVisibleButtons({ module, placement: ["list", "mass_action"] })
      : Promise.resolve([]),
    listUsers(),
    listFollowUpTemplates().catch(() => []),
    isFieldLayoutModule(module) ? listFieldDefs(module).catch(() => []) : Promise.resolve([]),
    tagModule ? listModuleTags(tagModule).catch(() => []) : Promise.resolve([]),
  ]);
  const fieldOptions = Object.fromEntries(
    fieldDefs
      .filter((field) => (field.options?.length ?? 0) > 0)
      .map((field) => [
        field.key,
        (field.options ?? []).map((option) => ({ value: option, label: option })),
      ]),
  );
  return (
    <ListSelectionProvider>
      <div className="px-3 pt-3">
        <ListMassBar
          module={module}
          recordIds={recordIds}
          records={records.map(serializeSelectionRecord)}
          owners={userRows.map((user) => ({ id: user.id, name: user.name }))}
          templates={templateRows.map((row) => ({ id: row.id, name: row.name }))}
          fieldOptions={fieldOptions}
          tagCatalog={tagCatalog}
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
          afterCheck={afterCheck}
          afterActions={afterActions}
          end={end}
          hideSelectionCue={hideSelectionCue}
        />
      </div>
      {children}
    </ListSelectionProvider>
  );
}
