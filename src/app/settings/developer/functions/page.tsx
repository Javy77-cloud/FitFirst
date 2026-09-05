import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { listDeveloperFunctions } from "@/lib/developer-hub/store";
import {
  FUNCTION_CATEGORIES,
  FUNCTION_CATEGORY_LABEL,
  FUNCTION_LANGUAGE_LABEL,
  isFunctionCategory,
  isFunctionLanguage,
  type FunctionCategory,
} from "@/lib/developer-hub/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DeveloperFunctionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const query = await searchParams;
  const categoryRaw = typeof query.category === "string" ? query.category : "";
  const category = isFunctionCategory(categoryRaw) ? categoryRaw : null;
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const error = typeof query.error === "string" ? query.error : undefined;
  const rows = await listDeveloperFunctions(category);

  return (
    <SettingsShell
      title="Functions"
      current="functions"
      actions={
        <Link href="/settings/developer/functions/new" className={cn(buttonVariants())}>
          New function
        </Link>
      }
    >
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Custom functions for buttons, automations, schedules, related lists, signals, validation,
        and standalone REST. The editor persists the body. Run test interprets an allowlisted JSON
        transform or returns a logged-args stub. Deluge is a label only.
      </p>
      {notice === "deleted" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">Function deleted.</p>
      ) : null}
      {notice === "created" ? (
        <p className="mb-3 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">Function created.</p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">Could not save that function.</p>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-1.5">
        <FilterChip href="/settings/developer/functions" active={!category} label="All" />
        {FUNCTION_CATEGORIES.map((item) => (
          <FilterChip
            key={item}
            href={`/settings/developer/functions?category=${item}`}
            active={category === item}
            label={FUNCTION_CATEGORY_LABEL[item]}
          />
        ))}
      </div>

      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No functions in this category. Create one or seed the desk.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>apiName</th>
                  <th>Category</th>
                  <th>Language</th>
                  <th>REST</th>
                  <th>OAuth</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={`/settings/developer/functions/${row.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td>
                      <code className="text-xs">{row.apiName}</code>
                    </td>
                    <td>
                      {FUNCTION_CATEGORY_LABEL[row.category as FunctionCategory] ?? row.category}
                    </td>
                    <td>
                      {isFunctionLanguage(row.language)
                        ? FUNCTION_LANGUAGE_LABEL[row.language]
                        : row.language}
                    </td>
                    <td>
                      {row.exposeAsRest ? <StatusChip status="working" /> : <span className="text-xs text-muted-foreground">Off</span>}
                    </td>
                    <td>
                      {row.exposeAsOauth ? (
                        <StatusChip status="needs_oauth" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Off</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SettingsShell>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-navy hover:bg-secondary/70",
      )}
    >
      {label}
    </Link>
  );
}
