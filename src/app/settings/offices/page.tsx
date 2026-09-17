import Link from "next/link";
import { deleteOffice, saveOffice } from "@/app/actions/offices";
import { AgentAssign } from "@/components/org/agent-assign";
import { StatePicker } from "@/components/org/state-picker";
import { ListOptionInput } from "@/components/settings/list-option-input";
import { SettingsEntityCard } from "@/components/settings/settings-entity-card";
import { SettingsShell } from "@/components/settings/settings-shell";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/guards";
import { listAgentRoster, listDeskAgents, listOffices } from "@/lib/org/queries";
import { formatStateList, US_TIMEZONES } from "@/lib/org/states";

export const dynamic = "force-dynamic";

export default async function OfficesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ office?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const [officeRows, agents, roster] = await Promise.all([
    listOffices(),
    listDeskAgents(),
    listAgentRoster(),
  ]);
  const editing = officeRows.find((row) => row.id === params.office) ?? null;

  return (
    <SettingsShell title="Offices" current="offices">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Physical desks. An agent can sit in more than one office — including offices in different
        states. Admin assigns people here. Agents cannot open this page.
      </p>

      {officeRows.length === 0 ? (
        <p className="mb-4 rounded-md border border-dashed border-border bg-card px-3 py-6 text-sm text-muted-foreground">
          No offices yet. Add Palm Bay or another desk below.
        </p>
      ) : (
        <ul className="mb-4 grid gap-3 lg:grid-cols-2">
          {officeRows.map((office) => {
            const people = roster.filter((row) => row.officeIds.includes(office.id));
            return (
              <li key={office.id}>
                <SettingsEntityCard
                  title={office.name}
                  meta={`${formatStateList(office.states)}${office.timezone ? ` · ${office.timezone}` : " · timezone not set"}`}
                  href={`/settings/offices?office=${office.id}`}
                >
                  <p>{office.address || "No street address"}</p>
                  <p className="text-helper text-muted-foreground">
                    {people.length === 0
                      ? "No agents assigned."
                      : people
                          .map(
                            (person) =>
                              `${person.name}${person.primaryOfficeId === office.id ? " (primary)" : ""}`,
                          )
                          .join(" · ")}
                  </p>
                </SettingsEntityCard>
              </li>
            );
          })}
        </ul>
      )}

      <section className="ff-list-card mb-4">
        <div className="ff-list-card-body space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-navy">
            {editing ? `Edit ${editing.name}` : "Add office"}
          </h2>
          <p className="mt-1 text-helper text-muted-foreground">
            Name, state(s), address, optional timezone. Check every agent who works this desk.
          </p>
        </div>
        <form action={saveOffice} className="space-y-3">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="office-name" className="text-xs">
                Name
              </Label>
              <ListOptionInput
                id="office-name"
                name="name"
                required
                committedValue={editing?.name ?? ""}
                placeholder="Palm Bay"
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label htmlFor="office-timezone" className="text-xs">
                Timezone (optional)
              </Label>
              <select
                id="office-timezone"
                name="timezone"
                defaultValue={editing?.timezone ?? ""}
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              >
                <option value="">Not set</option>
                {US_TIMEZONES.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="office-address" className="text-xs">
              Address
            </Label>
            <AddressAutocomplete
              id="office-address"
              name="address"
              defaultValue={editing?.address ?? ""}
              placeholder="2100 Palm Bay Rd NE, Palm Bay, FL 32905"
              composeOnConfirm
              className="mt-1 h-8"
            />
          </div>
          <StatePicker selected={editing?.states ?? []} />
          <AgentAssign
            agents={agents}
            selectedIds={
              editing ? roster.filter((row) => row.officeIds.includes(editing.id)).map((row) => row.userId) : []
            }
            primaryUserId={
              editing
                ? roster.find((row) => row.primaryOfficeId === editing.id)?.userId ?? null
                : null
            }
            showPrimary
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm">
              {editing ? "Save office" : "Add office"}
            </Button>
            {editing ? (
              <Link href="/settings/offices" className="text-sm text-primary hover:underline">
                Cancel
              </Link>
            ) : null}
          </div>
        </form>
        {editing ? (
          <HardDeleteForm action={deleteOffice} subject="this office">
            <input type="hidden" name="id" value={editing.id} />
            <button type="submit" className="text-xs text-destructive hover:underline">
              Delete this office
            </button>
          </HardDeleteForm>
        ) : null}
        </div>
      </section>

      <section className="ff-list-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Assignment roster
        </div>
        {roster.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No agents to assign.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Offices</th>
                  <th>Primary</th>
                  <th>Territories</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => (
                  <tr key={row.userId}>
                    <td>
                      <div className="font-medium text-navy">{row.name}</div>
                      <div className="text-helper text-muted-foreground">
                        {row.role === "admin" ? "Admin" : "Agent"} · {row.email}
                      </div>
                    </td>
                    <td>{row.officeNames.join(", ") || "—"}</td>
                    <td>{row.primaryOfficeName ?? "—"}</td>
                    <td>{row.territoryNames.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-4 py-3 text-helper text-muted-foreground">
          Territory membership is edited under{" "}
          <Link href="/settings/territories" className="text-primary hover:underline">
            Territories
          </Link>
          .
        </p>
      </section>
    </SettingsShell>
  );
}
