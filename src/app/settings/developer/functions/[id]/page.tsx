import Link from "next/link";
import { notFound } from "next/navigation";
import {
  removeDeveloperFunction,
  runDeveloperFunctionTest,
} from "@/app/actions/developer-hub";
import { FunctionForm } from "@/components/developer-hub/function-form";
import { OauthWall } from "@/components/developer-hub/oauth-wall";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { SettingsShell } from "@/components/settings/settings-shell";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminPage } from "@/lib/auth/guards";
import {
  getDeveloperFunction,
  listDeveloperConnections,
  listFunctionExecutions,
} from "@/lib/developer-hub/store";
import { FUNCTION_CATEGORY_LABEL, type FunctionCategory } from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

export default async function DeveloperFunctionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const fn = await getDeveloperFunction(id);
  if (!fn) notFound();
  const [connections, logs] = await Promise.all([
    listDeveloperConnections(),
    listFunctionExecutions(fn.id),
  ]);

  return (
    <SettingsShell title={fn.name} current="functions">
      <p className="mb-3 text-sm text-muted-foreground">
        <code>{fn.apiName}</code> ·{" "}
        {FUNCTION_CATEGORY_LABEL[fn.category as FunctionCategory] ?? fn.category}
      </p>
      {notice === "saved" || notice === "created" ? (
        <p className="mb-3 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">Function saved.</p>
      ) : null}
      {notice === "ran" ? (
        <p className="mb-3 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">
          Test ran. Input and output are on the execution log.
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

          <StatusChip status="working" className="mt-2" />
        </div>
      ) : null}

      <FunctionForm fn={fn} connections={connections} />

      <form action={runDeveloperFunctionTest} className="ff-card mt-4 max-w-3xl space-y-3 p-4">
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
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Output</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-xs">
                      {log.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td>{log.source}</td>
                    <td>{log.status}</td>
                    <td className="max-w-[280px] truncate font-mono text-xs">
                      {JSON.stringify(log.output)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <HardDeleteForm action={removeDeveloperFunction} subject="this function" className="mt-4">
        <input type="hidden" name="id" value={fn.id} />
        <Button type="submit" size="sm" variant="destructive">
          Delete function
        </Button>
      </HardDeleteForm>
      <p className="mt-3 text-sm">
        <Link href="/settings/developer/functions" className="text-primary hover:underline">
          All functions
        </Link>
      </p>
    </SettingsShell>
  );
}
