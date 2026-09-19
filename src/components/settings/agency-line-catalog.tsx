import {
  addAgencyLine,
  adoptOrphanLine,
  deleteAgencyLine,
  mapOrphanLine,
  normalizeAgencyLineOrphans,
  saveAgencyLine,
} from "@/app/actions/agency-lines";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import {
  AGENCY_LINE_FAMILY_LABEL,
  agencyLineFamilyCounts,
  type AgencyLine,
  type AgencyLineFamily,
  type AgencyLineOrphan,
} from "@/lib/desk/agency-lines";

const FAMILIES: AgencyLineFamily[] = ["pc", "life", "health"];

function FamilyBadge({ family }: { family: AgencyLineFamily }) {
  const tone =
    family === "life"
      ? "bg-sky-50 text-sky-800 ring-sky-200"
      : family === "health"
        ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
        : "bg-[#002868]/5 text-navy ring-[#002868]/15";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${tone}`}>
      {AGENCY_LINE_FAMILY_LABEL[family]}
    </span>
  );
}

export function AgencyLineCatalog({
  lines,
  orphans,
  canEdit,
}: {
  lines: AgencyLine[];
  orphans: AgencyLineOrphan[];
  canEdit: boolean;
}) {
  const counts = agencyLineFamilyCounts(lines);
  const groups = FAMILIES.map((family) => ({
    family,
    rows: lines.filter((line) => line.family === family),
  }));

  return (
    <section className="space-y-4" data-ff-agency-lines>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="bg-[linear-gradient(135deg,#002868_0%,#1d4ed8_55%,#0f766e_100%)] px-5 py-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Agency catalog
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Every record picks one line</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/80">
            Deals, policies, and field layouts bind to this list. Add a line the desk writes — do
            not type a new one on a record.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {[
            { label: "P&C", value: counts.pc },
            { label: "Life", value: counts.life },
            { label: "Health", value: counts.health },
            { label: "Needs a home", value: orphans.length, warn: orphans.length > 0 },
          ].map((stat) => (
            <div key={stat.label} className="bg-card px-4 py-3">
              <p className="text-helper text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-semibold ${stat.warn ? "text-amber-700" : "text-navy"}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {orphans.length > 0 ? (
        <div
          className="rounded-xl border border-amber-300 bg-amber-50/80 p-4"
          data-ff-agency-line-orphans
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-navy">Not on the list yet</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Old free-text values. Adopt as a new line or map onto one you already write.
              </p>
            </div>
            {canEdit ? (
              <form action={normalizeAgencyLineOrphans}>
                <Button type="submit" size="sm" variant="outline">
                  Normalize known aliases
                </Button>
              </form>
            ) : null}
          </div>
          <ul className="mt-3 space-y-2">
            {orphans.map((orphan) => (
              <li
                key={orphan.raw}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2"
                data-ff-agency-line-orphan={orphan.raw}
              >
                <span className="min-w-32 font-medium text-navy">{orphan.raw}</span>
                <span className="text-helper text-muted-foreground">
                  {orphan.count} {orphan.count === 1 ? "record" : "records"}
                </span>
                {canEdit ? (
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <form action={adoptOrphanLine} className="flex flex-wrap items-center gap-1.5">
                      <input type="hidden" name="raw" value={orphan.raw} />
                      <select
                        name="family"
                        className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                        defaultValue="pc"
                        aria-label={`Family for ${orphan.raw}`}
                      >
                        {FAMILIES.map((family) => (
                          <option key={family} value={family}>
                            {AGENCY_LINE_FAMILY_LABEL[family]}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        Adopt
                      </Button>
                    </form>
                    <form action={mapOrphanLine} className="flex flex-wrap items-center gap-1.5">
                      <input type="hidden" name="raw" value={orphan.raw} />
                      <select
                        name="toCode"
                        className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                        defaultValue=""
                        required
                        aria-label={`Map ${orphan.raw} onto`}
                      >
                        <option value="">Map onto…</option>
                        {lines
                          .filter((line) => line.active)
                          .map((line) => (
                            <option key={line.code} value={line.code}>
                              {line.label} ({line.code})
                            </option>
                          ))}
                      </select>
                      <Button type="submit" size="sm">
                        Map
                      </Button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map(({ family, rows }) => (
          <section key={family} className="ff-list-card" data-ff-agency-line-family={family}>
            <div className="ff-list-card-body space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-navy">{AGENCY_LINE_FAMILY_LABEL[family]}</h3>
                  <p className="text-helper text-muted-foreground">
                    {rows.filter((row) => row.active).length} active
                  </p>
                </div>
                <FamilyBadge family={family} />
              </div>
              <ul className="space-y-2">
                {rows.map((line) => (
                  <li
                    key={line.id ?? line.code}
                    className={`rounded-lg border px-3 py-2 ${
                      line.active ? "border-border bg-card" : "border-dashed border-border bg-muted/40"
                    }`}
                    data-ff-agency-line={line.code}
                  >
                    <div className="space-y-2">
                      <form action={saveAgencyLine} className="space-y-2">
                        <input type="hidden" name="id" value={line.id ?? ""} />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-navy px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
                            {line.code}
                          </span>
                          {canEdit ? (
                            <Input
                              name="label"
                              defaultValue={line.label}
                              className="h-8 min-w-32 flex-1"
                              aria-label={`Name for ${line.code}`}
                            />
                          ) : (
                            <span className="font-medium text-navy">{line.label}</span>
                          )}
                        </div>
                        {canEdit ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              name="family"
                              defaultValue={line.family}
                              className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                              aria-label={`Family for ${line.code}`}
                            >
                              {FAMILIES.map((item) => (
                                <option key={item} value={item}>
                                  {AGENCY_LINE_FAMILY_LABEL[item]}
                                </option>
                              ))}
                            </select>
                            <label className="flex items-center gap-1.5 text-xs text-navy">
                              <input
                                type="checkbox"
                                name="active"
                                value="true"
                                defaultChecked={line.active}
                              />
                              Active
                            </label>
                            <Button type="submit" size="sm" variant="outline">
                              Save
                            </Button>
                            {line.system ? (
                              <span className="text-helper text-muted-foreground">Seeded</span>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-helper text-muted-foreground">
                            {line.active ? "On the picker" : "Hidden from new records"}
                          </p>
                        )}
                      </form>
                      {canEdit && !line.system && line.id ? (
                        <HardDeleteForm action={deleteAgencyLine} subject="this line">
                          <input type="hidden" name="id" value={line.id} />
                          <FileDeleteIcon label={`Delete ${line.label}`} className="text-destructive" />
                        </HardDeleteForm>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>

      {canEdit ? (
        <form action={addAgencyLine} className="ff-list-card" data-ff-agency-line-add>
          <div className="ff-list-card-body flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1">
              <label className="text-helper text-muted-foreground" htmlFor="agency-line-label">
                New line name
              </label>
              <Input
                id="agency-line-label"
                name="label"
                required
                placeholder="Inland Marine"
                className="mt-1 h-8"
              />
            </div>
            <div>
              <label className="text-helper text-muted-foreground" htmlFor="agency-line-code">
                Code
              </label>
              <Input
                id="agency-line-code"
                name="code"
                placeholder="IM"
                className="mt-1 h-8 w-24"
              />
            </div>
            <div>
              <label className="text-helper text-muted-foreground" htmlFor="agency-line-family">
                Book
              </label>
              <select
                id="agency-line-family"
                name="family"
                defaultValue="pc"
                className="mt-1 h-8 rounded-md border border-input bg-card px-2 text-sm"
              >
                {FAMILIES.map((family) => (
                  <option key={family} value={family}>
                    {AGENCY_LINE_FAMILY_LABEL[family]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">
              Add line
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
