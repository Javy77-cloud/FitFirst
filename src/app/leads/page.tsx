import Link from "next/link";
import { createDealFromLead, createLead } from "@/app/actions/crm";
import { stubEmailLead, stubSocialLead } from "@/app/actions/lifecycle";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { LeadFormFields } from "@/components/crm/lead-form-fields";
import { LineSelect } from "@/components/crm/line-select";
import { StagePill } from "@/components/fit-badge";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { formatPersonName } from "@/lib/crm/display";
import { LINE_LABELS } from "@/lib/crm/bind";
import { LEAD_LANGUAGES } from "@/lib/crm/lead-fields";
import { defaultColumns } from "@/lib/desk/columns";
import { formatDay, type LineOfBusiness } from "@/lib/domain";
import { listLeads } from "@/lib/db/queries";

function languageLabel(value: string | null) {
  if (!value) return "—";
  return LEAD_LANGUAGES.find((lang) => lang.value === value)?.label ?? value;
}

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const rows = await listLeads();
  return (
    <AppShell
      title="Leads"
      columns={<ColumnPicker tableKey="leads" initial={defaultColumns("leads")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Capture the person first: name, date of birth, contact, address, and the insurance they
        want. Dec pages, wind mits, and 4-points belong on the Deal after you start a shop. Never
        duplicate — match by name plus phone or email.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <form action={stubEmailLead}>
          <Button type="submit" size="sm" variant="outline">
            Stub email lead
          </Button>
        </form>
        <form action={stubSocialLead}>
          <Button type="submit" size="sm" variant="outline">
            Stub social lead
          </Button>
        </form>
      </div>
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form action={createLead} className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">New lead</h2>
          <p className="text-xs text-muted-foreground">
            People record only. Start a shop from the table when you are ready to quote.
          </p>
          <LeadFormFields />
          <Button type="submit" size="sm">
            Save lead
          </Button>
        </form>

        <section className="ff-card overflow-x-auto">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  <Col table="leads" col="name" as="th">Name</Col>
                  <Col table="leads" col="firstName" as="th">First name</Col>
                  <Col table="leads" col="middleName" as="th">Middle name</Col>
                  <Col table="leads" col="lastName" as="th">Last name</Col>
                  <Col table="leads" col="dateOfBirth" as="th">Date of birth</Col>
                  <Col table="leads" col="status" as="th">Status</Col>
                  <Col table="leads" col="stage" as="th">Deal stage</Col>
                  <Col table="leads" col="source" as="th">Source</Col>
                  <Col table="leads" col="line" as="th">Insurance type desired</Col>
                  <Col table="leads" col="phone" as="th">Phone</Col>
                  <Col table="leads" col="email" as="th">Email</Col>
                  <Col table="leads" col="mailingAddress" as="th">Address</Col>
                  <Col table="leads" col="city" as="th">City</Col>
                  <Col table="leads" col="state" as="th">State</Col>
                  <Col table="leads" col="zip" as="th">ZIP</Col>
                  <Col table="leads" col="preferredLanguage" as="th">Preferred language</Col>
                  <Col table="leads" col="notes" as="th">Notes</Col>
                  <Col table="leads" col="created" as="th">Created</Col>
                  <Col table="leads" col="action" as="th">Shop</Col>
                </tr>
              </thead>
              <SheetTbody>
                {rows.map((lead) => (
                  <tr key={lead.id}>
                    <Col table="leads" col="name" className="font-medium">
                      <RecordLink href={`/leads/${lead.id}`}>{formatPersonName(lead)}</RecordLink>
                    </Col>
                    <Col table="leads" col="firstName">{lead.firstName}</Col>
                    <Col table="leads" col="middleName">{lead.middleName ?? "—"}</Col>
                    <Col table="leads" col="lastName">{lead.lastName}</Col>
                    <Col table="leads" col="dateOfBirth">{lead.dateOfBirth || "—"}</Col>
                    <Col table="leads" col="status" className="uppercase">
                      {lead.status}
                    </Col>
                    <Col table="leads" col="stage">
                      {lead.dealStage ? (
                        lead.relatedDealId ? (
                          <RecordLink href={`/deals/${lead.relatedDealId}`}>
                            <StagePill stage={lead.dealStage} />
                          </RecordLink>
                        ) : (
                          <StagePill stage={lead.dealStage} />
                        )
                      ) : (
                        "—"
                      )}
                    </Col>
                    <Col table="leads" col="source">{lead.source}</Col>
                    <Col table="leads" col="line">
                      {lead.insuranceTypeDesired
                        ? (LINE_LABELS[lead.insuranceTypeDesired as LineOfBusiness] ??
                          lead.insuranceTypeDesired)
                        : "—"}
                    </Col>
                    <Col table="leads" col="phone">{lead.phone ?? "—"}</Col>
                    <Col table="leads" col="email">{lead.email ?? "—"}</Col>
                    <Col table="leads" col="mailingAddress">{lead.mailingAddress ?? "—"}</Col>
                    <Col table="leads" col="city">{lead.city ?? "—"}</Col>
                    <Col table="leads" col="state">{lead.state ?? "—"}</Col>
                    <Col table="leads" col="zip">{lead.zip ?? "—"}</Col>
                    <Col table="leads" col="preferredLanguage">{languageLabel(lead.preferredLanguage)}</Col>
                    <Col table="leads" col="notes">{lead.notes ?? "—"}</Col>
                    <Col table="leads" col="created">{formatDay(lead.createdAt)}</Col>
                    <Col table="leads" col="action">
                      {lead.convertedDealId ? (
                        <Link href={`/deals/${lead.convertedDealId}`} className="text-xs text-primary">
                          Open deal
                        </Link>
                      ) : (
                        <form action={createDealFromLead} className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                          <input type="hidden" name="leadId" value={lead.id} />
                          <LineSelect
                            id={`line-${lead.id}`}
                            defaultValue={lead.insuranceTypeDesired ?? "HO"}
                          />
                          <Button type="submit" size="xs">
                            Start shop
                          </Button>
                        </form>
                      )}
                    </Col>
                  </tr>
                ))}
              </SheetTbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
