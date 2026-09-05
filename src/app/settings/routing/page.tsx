import Link from "next/link";
import { deleteLeadRoutingRule, saveLeadRoutingRule } from "@/app/actions/lead-routing";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/guards";
import { ROUTING_LINE_LABEL, ROUTING_LINES } from "@/lib/leads/auto-route";
import { loadRoutingContext } from "@/lib/leads/apply-routing";
import { listDeskAgents, listTerritories } from "@/lib/org/queries";

export const dynamic = "force-dynamic";

export default async function LeadRoutingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ rule?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const [ctx, territories, agents] = await Promise.all([
    loadRoutingContext(),
    listTerritories(),
    listDeskAgents(),
  ]);
  const editing = ctx.rules.find((row) => row.id === params.rule) ?? null;
  const names = new Map(agents.map((agent) => [agent.id, agent.name]));
  const territoryNames = new Map(territories.map((row) => [row.id, row.name]));

  return (
    <SettingsShell title="Lead routing" current="routing">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Rules run on unassigned inbound. First match by priority wins: territory, written line
        (Home / Auto / …), then producer capacity (open deals under the cap). No match posts the
        Lead on the Home lead-offer board. Not ML.
      </p>

      {ctx.rules.length === 0 ? (
        <p className="mb-4 rounded-md border border-dashed border-border bg-card px-3 py-6 text-sm text-muted-foreground">
          No rules yet. Add Space Coast Home below.
        </p>
      ) : (
        <ul className="mb-4 grid gap-3">
          {ctx.rules.map((rule) => {
            const producer = ctx.producers.find((row) => row.id === rule.producerId);
            return (
              <li key={rule.id} className="ff-card space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-navy">{rule.name}</h2>
                    <p className="text-helper text-muted-foreground">
                      Priority {rule.sortOrder}
                      {rule.enabled ? "" : " · Off"}
                      {" · "}
                      {rule.territoryId
                        ? territoryNames.get(rule.territoryId) ?? "Territory"
                        : "Any territory"}
                      {" · "}
                      {rule.writtenLine
                        ? ROUTING_LINE_LABEL[rule.writtenLine as keyof typeof ROUTING_LINE_LABEL] ??
                          rule.writtenLine
                        : "Any line"}
                      {" · cap "}
                      {rule.maxOpenDeals} open deals
                      {producer ? ` · prefer ${producer.name}` : " · least-loaded producer"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/settings/routing?rule=${rule.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    <HardDeleteForm action={deleteLeadRoutingRule} subject="this routing rule">
                      <input type="hidden" name="id" value={rule.id} />
                      <button type="submit" className="text-xs text-destructive hover:underline">
                        Remove
                      </button>
                    </HardDeleteForm>
                  </div>
                </div>
                <p className="text-helper text-muted-foreground">
                  Booked now:{" "}
                  {ctx.producers
                    .filter((row) => names.has(row.id) || row.role === "admin")
                    .slice(0, 6)
                    .map((row) => `${row.name} ${row.openDealCount} open`)
                    .join(" · ") || "no producers"}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <section className="ff-card space-y-3 p-4">
        <h2 className="text-sm font-semibold text-navy">
          {editing ? `Edit ${editing.name}` : "Add a routing rule"}
        </h2>
        <form action={saveLeadRoutingRule} className="grid gap-3 sm:grid-cols-2">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <div className="sm:col-span-2">
            <Label htmlFor="rule-name" className="text-xs">
              Name
            </Label>
            <Input
              id="rule-name"
              name="name"
              required
              className="mt-1 h-8"
              defaultValue={editing?.name ?? ""}
              placeholder="Space Coast Home"
            />
          </div>
          <div>
            <Label htmlFor="rule-sort" className="text-xs">
              Priority (lower first)
            </Label>
            <Input
              id="rule-sort"
              name="sortOrder"
              type="number"
              className="mt-1 h-8"
              defaultValue={editing?.sortOrder ?? 10}
            />
          </div>
          <div>
            <Label htmlFor="rule-cap" className="text-xs">
              Max open deals
            </Label>
            <Input
              id="rule-cap"
              name="maxOpenDeals"
              type="number"
              className="mt-1 h-8"
              defaultValue={editing?.maxOpenDeals ?? 12}
            />
          </div>
          <div>
            <Label htmlFor="rule-territory" className="text-xs">
              Territory
            </Label>
            <select
              id="rule-territory"
              name="territoryId"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue={editing?.territoryId ?? ""}
            >
              <option value="">Any territory</option>
              {territories.map((territory) => (
                <option key={territory.id} value={territory.id}>
                  {territory.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="rule-line" className="text-xs">
              Written line
            </Label>
            <select
              id="rule-line"
              name="writtenLine"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue={editing?.writtenLine ?? ""}
            >
              <option value="">Any line</option>
              {ROUTING_LINES.map((line) => (
                <option key={line} value={line}>
                  {ROUTING_LINE_LABEL[line]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="rule-producer" className="text-xs">
              Prefer this producer
            </Label>
            <select
              id="rule-producer"
              name="producerId"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue={editing?.producerId ?? ""}
            >
              <option value="">Least-loaded producer in the territory</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="enabled" value="1" defaultChecked={editing?.enabled ?? true} />
            Rule is on
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm">
              {editing ? "Save rule" : "Add rule"}
            </Button>
            {editing ? (
              <Link href="/settings/routing" className="ml-3 text-sm text-primary hover:underline">
                Cancel
              </Link>
            ) : null}
          </div>
        </form>
      </section>
    </SettingsShell>
  );
}
