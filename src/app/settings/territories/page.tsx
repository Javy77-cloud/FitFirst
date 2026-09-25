import Link from "next/link";
import { deleteTerritory, saveTerritory } from "@/app/actions/offices";
import { AgentAssign } from "@/components/org/agent-assign";
import { StatePicker } from "@/components/org/state-picker";
import { ListOptionInput } from "@/components/settings/list-option-input";
import { SettingsEntityCard } from "@/components/settings/settings-entity-card";
import { SettingsShell } from "@/components/settings/settings-shell";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminPage } from "@/lib/auth/guards";
import { listAgentRoster, listDeskAgents, listOffices, listTerritories, listTerritoryOffices } from "@/lib/org/queries";
import { formatStateList } from "@/lib/org/states";

export const dynamic = "force-dynamic";

export default async function TerritoriesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ territory?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const [territoryRows, officeRows, officeLinks, agents, roster] = await Promise.all([
    listTerritories(),
    listOffices(),
    listTerritoryOffices(),
    listDeskAgents(),
    listAgentRoster(),
  ]);
  const editing = territoryRows.find((row) => row.id === params.territory) ?? null;
  const linkedForEdit = editing
    ? officeLinks.filter((row) => row.territoryId === editing.id).map((row) => row.officeId)
    : [];

  return (
    <SettingsShell title="Territories" current="territories">

      {territoryRows.length === 0 ? (
        <p className="mb-4 rounded-md border border-dashed border-border bg-card px-3 py-6 text-sm text-muted-foreground">No territories yet.</p>
      ) : (
        <ul className="mb-4 grid gap-3">
          {territoryRows.map((territory) => {
            const linked = officeLinks
              .filter((row) => row.territoryId === territory.id)
              .map((row) => officeRows.find((office) => office.id === row.officeId)?.name)
              .filter((name): name is string => Boolean(name));
            const people = roster.filter((row) => row.territoryIds.includes(territory.id));
            return (
              <li key={territory.id}>
                <SettingsEntityCard
                  title={territory.name}
                  meta={`${territory.geoLabel || "No geo label"} · ${formatStateList(territory.states)}${territory.counties.length ? ` · ${territory.counties.join(", ")}` : ""}`}
                  href={`/settings/territories?territory=${territory.id}`}
                >
                  <p className="text-helper text-muted-foreground">
                    Offices: {linked.join(", ") || "none linked"}
                  </p>
                  <p className="text-helper text-muted-foreground">
                    Direct agents: {people.map((person) => person.name).join(" · ") || "none"}
                  </p>
                </SettingsEntityCard>
              </li>
            );
          })}
        </ul>
      )}

      <section className="ff-list-card">
        <div className="ff-list-card-body space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-navy">
            {editing ? `Edit ${editing.name}` : "Add territory"}
          </h2>

        </div>
        <form action={saveTerritory} className="space-y-3">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="territory-name" className="text-xs">
                Name
              </Label>
              <ListOptionInput
                id="territory-name"
                name="name"
                required
                committedValue={editing?.name ?? ""}
                placeholder="Space Coast"
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label htmlFor="territory-geo" className="text-xs">
                Freeform geo label
              </Label>
              <ListOptionInput
                id="territory-geo"
                name="geoLabel"
                committedValue={editing?.geoLabel ?? ""}
                placeholder="Palm Bay / Melbourne / Brevard"
                className="mt-1 h-8"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="territory-counties" className="text-xs">
              Counties
            </Label>
            <Textarea
              id="territory-counties"
              name="counties"
              defaultValue={editing?.counties.join(", ") ?? ""}
              placeholder="Brevard, Indian River"
              className="mt-1 min-h-16"
            />
          </div>
          <StatePicker selected={editing?.states ?? []} />
          <fieldset>
            <legend className="text-helper text-muted-foreground">Linked offices (optional)</legend>
            {officeRows.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Add an office first under{" "}
                <Link href="/settings/offices" className="text-primary hover:underline">
                  Offices
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-1 divide-y divide-border rounded-md border border-border">
                {officeRows.map((office) => (
                  <li key={office.id} className="px-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-navy">
                      <input
                        type="checkbox"
                        name="officeIds"
                        value={office.id}
                        defaultChecked={linkedForEdit.includes(office.id)}
                        className="size-3.5 accent-primary"
                      />
                      {office.name}
                      <span className="text-helper text-muted-foreground">
                        {formatStateList(office.states)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
          <AgentAssign
            agents={agents}
            selectedIds={
              editing
                ? roster.filter((row) => row.territoryIds.includes(editing.id)).map((row) => row.userId)
                : []
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm">
              {editing ? "Save territory" : "Add territory"}
            </Button>
            {editing ? (
              <Link href="/settings/territories" className="text-sm text-primary hover:underline">
                Cancel
              </Link>
            ) : null}
          </div>
        </form>
        {editing ? (
          <HardDeleteForm action={deleteTerritory} subject="this territory">
            <input type="hidden" name="id" value={editing.id} />
            <button type="submit" className="text-xs text-destructive hover:underline">
              Delete this territory
            </button>
          </HardDeleteForm>
        ) : null}
        </div>
      </section>
    </SettingsShell>
  );
}
