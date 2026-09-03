import { LINES, SELLING_AGENCIES, type CommissionRange, type CommissionView } from "@/lib/domain";

const RANGE_LABEL: Record<CommissionRange, string> = {
  all: "All",
  pending: "Pending",
  paid: "Paid",
  last_30: "Last 30 days",
  last_quarter: "Last quarter",
  fiscal_year: "This fiscal year",
  upcoming: "Upcoming to be paid",
};

export function CommissionFilters({
  view,
  range,
  from,
  to,
  carrierId,
  line,
  agentId,
  sellingAgency,
  carriers,
  agents,
  showAgent,
}: {
  view: CommissionView;
  range: CommissionRange;
  from?: string;
  to?: string;
  carrierId?: string;
  line?: string;
  agentId?: string;
  sellingAgency?: string;
  carriers: Array<{ id: string; name: string }>;
  agents: Array<{ id: string; name: string }>;
  showAgent: boolean;
}) {
  return (
    <form method="get" className="mb-4 grid gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-7">
      <input type="hidden" name="view" value={view} />
      <label className="block text-[11px] text-muted-foreground">
        Period
        <select
          name="range"
          defaultValue={range}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          {(Object.keys(RANGE_LABEL) as CommissionRange[]).map((key) => (
            <option key={key} value={key}>
              {RANGE_LABEL[key]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[11px] text-muted-foreground">
        From
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        />
      </label>
      <label className="block text-[11px] text-muted-foreground">
        To
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        />
      </label>
      <label className="block text-[11px] text-muted-foreground">
        Carrier
        <select
          name="carrierId"
          defaultValue={carrierId ?? ""}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">All carriers</option>
          {carriers.map((carrier) => (
            <option key={carrier.id} value={carrier.id}>
              {carrier.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[11px] text-muted-foreground">
        Line
        <select
          name="line"
          defaultValue={line ?? ""}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">All lines</option>
          {LINES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {showAgent ? (
        <label className="block text-[11px] text-muted-foreground">
          Agent
          <select
            name="agentId"
            defaultValue={agentId ?? ""}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">All agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div />
      )}
      <label className="block text-[11px] text-muted-foreground">
        Selling agency
        <select
          name="sellingAgency"
          defaultValue={sellingAgency ?? ""}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">All desks</option>
          {SELLING_AGENCIES.map((row) => (
            <option key={row.key} value={row.key}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-2 lg:col-span-7">
        <button
          type="submit"
          className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
        >
          Apply filters
        </button>
        <a href={`/commissions?view=${view}`} className="h-8 rounded-md px-3 text-xs leading-8 text-muted-foreground hover:text-navy">
          Clear
        </a>
      </div>
    </form>
  );
}
