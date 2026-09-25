import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
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

export default async function FunctionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSignedIn();
  const query = await searchParams;
  const categoryRaw = typeof query.category === "string" ? query.category : "";
  const category = isFunctionCategory(categoryRaw) ? categoryRaw : null;
  const rows = await listDeveloperFunctions(category);

  return (
    <AppShell
      title="Functions"
      actions={
        <Link href="/automations/functions/new" className={cn(buttonVariants())}>
          New function
        </Link>
      }
    >
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Link
          href="/automations/functions"
          className={cn(
            "rounded-md px-2.5 py-1 text-xs",
            !category ? "bg-navy text-white" : "border border-border bg-card text-navy",
          )}
        >
          All
        </Link>
        {FUNCTION_CATEGORIES.map((item) => (
          <Link
            key={item}
            href={`/automations/functions?category=${item}`}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs",
              category === item ? "bg-navy text-white" : "border border-border bg-card text-navy",
            )}
          >
            {FUNCTION_CATEGORY_LABEL[item]}
          </Link>
        ))}
      </div>
      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No functions in this category.</p>
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
                        href={`/automations/functions/${row.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td>
                      <code className="text-xs">{row.apiName}</code>
                    </td>
                    <td>{FUNCTION_CATEGORY_LABEL[row.category as FunctionCategory] ?? row.category}</td>
                    <td>
                      {isFunctionLanguage(row.language)
                        ? FUNCTION_LANGUAGE_LABEL[row.language]
                        : row.language}
                    </td>
                    <td>
                      {row.exposeAsRest ? (
                        <StatusChip status="working" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Off</span>
                      )}
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
    </AppShell>
  );
}
