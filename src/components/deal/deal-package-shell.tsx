import {
  INSURED_ADDRESS_LABEL,
  MAILING_ADDRESS_LABEL,
  formatHeaderAddress,
  mailingHeaderValue,
  shouldShowMailingAddress,
  type HeaderAddressParts,
} from "@/lib/deals/header-addresses";
import { formatMailingLine, humanizeDealStage } from "@/lib/deals/package-lines";
import { formatDob } from "@/lib/domain";

export function DealPackageShell({
  name,
  phones,
  dob,
  insuredAddress,
  mailingAddress,
  stage,
  owner,
  activity,
}: {
  name: string;
  phones: string[];
  dob?: string | null;
  insuredAddress?: HeaderAddressParts | null;
  mailingAddress?: HeaderAddressParts | null;
  stage?: string | null;
  owner?: string | null;
  activity?: string | null;
}) {
  const phoneText = phones.filter(Boolean).join(" · ") || "—";
  const insuredLine = formatHeaderAddress(insuredAddress) || "—";
  const mailingDistinct = shouldShowMailingAddress(insuredAddress, mailingAddress);
  const mailingLine = mailingHeaderValue(insuredAddress, mailingAddress);
  const rows = [
    { label: "Name", value: name || "—", key: "name" },
    { label: "Phones", value: phoneText, key: "phones" },
    { label: "DOB", value: formatDob(dob), key: "dob" },
    { label: INSURED_ADDRESS_LABEL, value: insuredLine, key: "insured" },
    { label: MAILING_ADDRESS_LABEL, value: mailingLine, key: "mailing" },
    { label: "Stage", value: humanizeDealStage(stage), key: "stage" },
    { label: "Owner", value: owner?.trim() || "—", key: "owner" },
    { label: "Activity", value: activity?.trim() || "—", key: "activity" },
  ];
  return (
    <dl
      className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4"
      data-ff-deal-package-shell=""
      data-ff-header-show-mailing={mailingDistinct ? "1" : "0"}
      data-ff-header-mailing-same={mailingDistinct ? "0" : "1"}
    >
      {rows.map((row) => (
        <div key={row.key} className="min-w-0">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {row.label}
          </dt>
          <dd
            className="truncate text-navy"
            title={row.value}
            data-ff-header-address={row.key === "insured" || row.key === "mailing" ? row.key : undefined}
            data-ff-header-dob={row.key === "dob" ? "" : undefined}
          >
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
