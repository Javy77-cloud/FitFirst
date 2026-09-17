import Link from "next/link";
import { createEmptyFieldPicklist } from "@/app/actions/field-picklists";
import { PicklistCard } from "@/components/settings/picklist-card";
import { StayOnSaveForm } from "@/components/settings/stay-on-save-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listFieldPicklists } from "@/lib/custom-fields/picklist-store";

export const dynamic = "force-dynamic";

export default async function FieldPicklistsPage() {
  const lists = await listFieldPicklists();

  return (
    <SettingsShell title="Picklists" current="picklists">
      <p className="mb-4 text-sm text-muted-foreground">
        Global option lists for picklist and multi-select fields. Create a list once, then reuse it
        on any field on any line of business. Each value can have a color from the full desk palette
        and one Default. Values sort A–Z on save. Starter lists — US states, lines of business,
        common carriers, and Deal notices (P&amp;C / Life / Health) — show under{" "}
        <span className="font-medium text-navy">Custom</span> on the field builder option-set chooser.
        Each family has its own Deal notices list for the header / Quotes chip. These are not the
        policy book lists under Lines / Global lists.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/settings/field-builder" className="text-sm text-primary hover:underline">
          Back to field builder
        </Link>
      </div>

      <StayOnSaveForm
        action={createEmptyFieldPicklist}
        flash="pick-list-saved"
        className="ff-list-card mb-4"
      >
        <div data-ff-new-picklist className="ff-list-card-body flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted-foreground">
            New list name
            <Input name="name" placeholder="e.g. US states" className="mt-0.5 h-8 w-56" />
          </label>
          <Button type="submit" size="sm">
            Create picklist
          </Button>
        </div>
      </StayOnSaveForm>

      {lists.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-ff-picklists-empty>
          No global picklists yet. Create one here, then choose it when you drop a picklist or
          multi-select on the field builder.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2" data-ff-picklists>
          {lists.map((list) => (
            <PicklistCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </SettingsShell>
  );
}
