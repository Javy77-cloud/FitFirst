import Link from "next/link";
import {
  LeadCadenceSelect,
  LeadHeatToggle,
  LeadPipelineStatusSelect,
  LeadTemplateOverride,
} from "@/components/leads/lead-queue-controls";
import { ResponseTimer } from "@/components/leads/response-timer";
import { ColumnTable, type ColumnRow } from "@/components/lists/column-table";
import type { LeadDeskRecord } from "@/lib/leads/lead-desk";
import type { ListColumn } from "@/lib/list-columns";

export const LEADS_HOST_LIST_COLUMNS: ListColumn[] = [
  { id: "name", label: "Name", locked: true, liveSearch: true },
  { id: "policyForm", label: "Policy form" },
  { id: "lob", label: "LOB" },
  { id: "cadence", label: "Cadence" },
  { id: "status", label: "Status" },
  { id: "response", label: "Response" },
  { id: "followUp", label: "Follow-up" },
  { id: "heat", label: "Heat" },
  { id: "silence", label: "Silence" },
  { id: "next", label: "Next chase" },
  { id: "source", label: "Source", defaultOn: false },
  { id: "phone", label: "Phone", defaultOn: false },
  { id: "email", label: "Email", defaultOn: false },
];

export function LeadsHostList({
  records,
  templates,
  initialQuery = "",
}: {
  records: LeadDeskRecord[];
  templates: Array<{ id: string; name: string; triggerStatus: string }>;
  initialQuery?: string;
}) {
  const rows: ColumnRow[] = records.map((record) => ({
    key: record.id,
    id: record.id,
    parked: record.parked,
    hay: record.hay,
    sort: {
      policyForm: record.policyForm,
      lob: record.lob,
      cadence: record.cadence,
      status: record.status,
      heat: record.temperature,
      silence: record.silence,
      next: record.dueAt ?? "",
      followUp: record.followUpName,
    },
    cells: {
      name: (
        <Link href={record.href} className="font-semibold text-navy hover:underline">
          {record.name}
        </Link>
      ),
      policyForm: (
        <span data-ff-lead-policy-form="">{record.policyForm || "—"}</span>
      ),
      lob: record.lob || "—",
      cadence: <LeadCadenceSelect leadId={record.id} cadence={record.cadence} />,
      status: <LeadPipelineStatusSelect leadId={record.id} status={record.status} />,
      response: <ResponseTimer leadId={record.id} dueAt={record.dueAt} done={record.clockDone} />,
      followUp: (
        <LeadTemplateOverride
          leadId={record.id}
          templateId={record.templateId}
          templates={templates}
          resolvedName={record.followUpName}
          resolvedTemplateId={record.resolvedTemplateId}
        />
      ),
      heat: <LeadHeatToggle leadId={record.id} temperature={record.temperature} />,
      silence: record.silence,
      next: (
        <Link href={record.href} className="hover:underline" data-ff-next-chase="">
          {record.nextChase}
        </Link>
      ),
      source: record.sourceText,
      phone: record.phone || "—",
      email: record.email || "—",
    },
  }));

  return (
    <div data-ff-leads-host-list="">
      <ColumnTable
        moduleId="leads-host"
        searchModuleId="leads"
        initialQuery={initialQuery}
        columns={LEADS_HOST_LIST_COLUMNS}
        rows={rows}
        empty={<p className="ff-deals-empty">No open leads in this queue. Converted records are on Deals.</p>}
      />
    </div>
  );
}
