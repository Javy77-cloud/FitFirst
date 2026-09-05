import { AutomationsDeveloperFrame } from "@/components/automations/developer-frame";
import { FunctionForm } from "@/components/developer-hub/function-form";
import { requireSignedIn } from "@/lib/auth/guards";
import { listDeveloperConnections } from "@/lib/developer-hub/store";

export const dynamic = "force-dynamic";

export default async function AutomationsNewFunctionPage() {
  const session = await requireSignedIn();
  const connections = session.isAdmin ? await listDeveloperConnections() : [];

  return (
    <AutomationsDeveloperFrame title="New function" isAdmin={session.isAdmin}>
      {session.isAdmin ? <FunctionForm connections={connections} surface="automations" /> : null}
    </AutomationsDeveloperFrame>
  );
}
