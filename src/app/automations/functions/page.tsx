import Link from "next/link";
import { AutomationsDeveloperFrame } from "@/components/automations/developer-frame";
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

export default async function AutomationsFunctionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const query = await searchParams;
  const categoryRaw = typeof query.category === "string" ? query.category : "";
  const category = isFunctionCategory(categoryRaw) ? categoryRaw : null;
  const rows = session.isAdmin ? await listDeveloperFunctions(category) : [];

  return (
    <AutomationsDeveloperFrame
      title="Functions"
      isAdmin={session.isAdmin}
      actions={
        <Link href="/automations/functions/new" className={cn(buttonVariants())}>
          New function
        </Link>
      }
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Custom functions for automations, buttons, and standalone REST. Run test uses an
        allowlisted JSON transform. Same rows as Settings → Developer Hub → Functions.
      </p>
      {session.isAdmin ? (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Link
              href="/automations/functions"
              className={cn(
                "rounded-md px-2.5 py-1 text-xs",
                !category ? "bg-primary text-primary-foreground" : "bg-secondary text-navy",
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
                  category === item ? "bg-primary text-primary-foreground" : "bg-secondary text-navy",
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
                        <td>
                          {FUNCTION_CATEGORY_LABEL[row.category as FunctionCategory] ?? row.category}
                        </td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </AutomationsDeveloperFrame>
  );
}
