import { RecordDeveloperActions } from "@/components/developer-hub/record-actions";
import { parseMacroKind } from "@/lib/developer-hub/macros";
import { listEnabledMacrosFor, listVisibleButtons } from "@/lib/db/developer-hub-queries";
import type { DevHubModule } from "@/lib/developer-hub/types";

export async function RecordModuleMacros({
  module,
  recordId,
}: {
  module: DevHubModule;
  recordId: string;
}) {
  const [macros, buttons] = await Promise.all([
    listEnabledMacrosFor(module),
    listVisibleButtons({ module, placement: "detail" }),
  ]);
  return (
    <RecordDeveloperActions
      module={module}
      recordId={recordId}
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
      }))}
    />
  );
}
