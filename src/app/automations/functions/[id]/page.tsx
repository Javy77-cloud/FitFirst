import Link from "next/link";
import { notFound } from "next/navigation";
import {
  removeDeveloperFunction,
  runDeveloperFunctionTest,
} from "@/app/actions/developer-hub";
import { AutomationsDeveloperFrame } from "@/components/automations/developer-frame";
import { FunctionForm } from "@/components/developer-hub/function-form";
import { OauthWall } from "@/components/developer-hub/oauth-wall";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireSignedIn } from "@/lib/auth/guards";
import { DEMO_ORG_API_KEY } from "@/lib/developer-hub/keys";
import {
  getDeveloperFunction,
  listDeveloperConnections,
  listFunctionExecutions,
} from "@/lib/developer-hub/store";

export const dynamic = "force-dynamic";

export default async function AutomationsFunctionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const { id } = await params;
  const query = await searchParams;
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const fn = await getDeveloperFunction(id);
  if (!fn) notFound();
  const [connections, logs] = session.isAdmin
    ? await Promise.all([listDeveloperConnections(), listFunctionExecutions(fn.id)])
    : [[], []];

  return (
    <AutomationsDeveloperFrame title={fn.name} isAdmin={session.isAdmin}>
      {notice === "ran" ? (
        <p className="mb-3 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">
          Test ran. See the execution log.
        </p>
      ) : null}
      {fn.exposeAsOauth ? (
        <div className="mb-4">
          <OauthWall title="OAuth 2.0 expose · Connect later" provider="Function OAuth" />
        </div>
      ) : null}
      {fn.exposeAsRest ? (
        <div className="mb-4 rounded-md border border-dashed border-border px-3 py-3 text-sm">
          <div className="font-medium text-navy">REST stub</div>
          <p className="mt-1 text-muted-foreground">
            <code>POST /api/dev/functions/{fn.apiName}/execute</code> · Bearer {DEMO_ORG_API_KEY}
          </p>
          <StatusChip status="working" className="mt-2" />
        </div>
      ) : null}
      {session.isAdmin ? (
        <>
          <FunctionForm fn={fn} connections={connections} surface="automations" />
          <form action={runDeveloperFunctionTest} className="ff-card mt-4 max-w-3xl space-y-3 p-4">
            <input type="hidden" name="surface" value="automations" />
            <input type="hidden" name="id" value={fn.id} />
            <div>
              <Label className="text-xs">Run test input (JSON)</Label>
              <Textarea
                name="input"
                defaultValue='{"contact":"Elena Ruiz","line":"HO"}'
                className="mt-1 min-h-20 font-mono text-xs"
                spellCheck={false}
              />
            </div>
            <Button type="submit" size="sm" variant="outline">
              Run test
            </Button>
          </form>
          <section className="ff-card mt-4 max-w-3xl overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              Execution log
            </div>
            {logs.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">No runs yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {logs.slice(0, 8).map((log) => (
                  <li key={log.id} className="px-4 py-2 text-xs">
                    {log.source} · {log.status} · {JSON.stringify(log.output)}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <form action={removeDeveloperFunction} className="mt-4">
            <input type="hidden" name="surface" value="automations" />
            <input type="hidden" name="id" value={fn.id} />
            <Button type="submit" size="sm" variant="destructive">
              Delete function
            </Button>
          </form>
        </>
      ) : null}
      <p className="mt-3 text-sm">
        <Link href="/automations/functions" className="text-primary hover:underline">
          All functions
        </Link>
      </p>
    </AutomationsDeveloperFrame>
  );
}
