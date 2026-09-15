import { formatMailingLine, humanizeDealStage } from "@/lib/deals/package-lines";

export function DealPackageShell({
  name,
  phones,
  dob,
  mailing,
  stage,
  owner,
  activity,
}: {
  name: string;
  phones: string[];
  dob?: string | null;
  mailing?: string | null;
  stage?: string | null;
  owner?: string | null;
  activity?: string | null;
}) {
  const phoneText = phones.filter(Boolean).join(" · ") || "—";
  const rows = [
    { label: "Name", value: name || "—" },
    { label: "Phones", value: phoneText },
    { label: "DOB", value: dob?.trim() || "—" },
    { label: "Mailing", value: mailing?.trim() || "—" },
    { label: "Stage", value: humanizeDealStage(stage) },
    { label: "Owner", value: owner?.trim() || "—" },
    { label: "Activity", value: activity?.trim() || "—" },
  ];
  return (
    <dl
      className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4"
      data-ff-deal-package-shell=""
    >
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {row.label}
          </dt>
          <dd className="truncate text-navy" title={row.value}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function mailingFromRecords(input: {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  return formatMailingLine(input);
}
