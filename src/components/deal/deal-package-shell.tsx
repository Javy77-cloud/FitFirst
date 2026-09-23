import type { ReactNode } from "react";
import {
  INSURED_ADDRESS_LABEL,
  MAILING_ADDRESS_LABEL,
  formatHeaderAddress,
  formatHeaderDob,
  mailingHeaderValue,
  shouldShowMailingAddress,
  uniqueDisplayPhones,
  type HeaderAddressParts,
} from "@/lib/deals/header-addresses";
import { formatMailingLine, humanizeDealStage } from "@/lib/deals/package-lines";

type HeaderField = {
  label: string;
  value: string;
  key: string;
  control?: ReactNode;
};

export function DealPackageShell({
  name,
  phones,
  dob,
  insuredAddress,
  mailingAddress,
  stage,
  owner,
  activity,
  stageControl,
}: {
  name: string;
  phones: string[];
  dob?: string | null;
  insuredAddress?: HeaderAddressParts | null;
  mailingAddress?: HeaderAddressParts | null;
  stage?: string | null;
  owner?: string | null;
  activity?: string | null;
  stageControl?: ReactNode;
}) {
  const phoneText = uniqueDisplayPhones(phones).join(" · ") || "—";
  const insuredLine = formatHeaderAddress(insuredAddress) || "—";
  const mailingDistinct = shouldShowMailingAddress(insuredAddress, mailingAddress);
  const mailingLine = mailingHeaderValue(insuredAddress, mailingAddress);
  const columns: HeaderField[][] = [
    [
      { label: "Name", value: name || "—", key: "name" },
      { label: "Pipeline", value: humanizeDealStage(stage), key: "stage", control: stageControl },
    ],
    [
      { label: "Phones", value: phoneText, key: "phones" },
      { label: "Owner", value: owner?.trim() || "—", key: "owner" },
    ],
    [
      { label: "DOB", value: formatHeaderDob(dob), key: "dob" },
      { label: "Activity", value: activity?.trim() || "—", key: "activity" },
    ],
    [
      { label: INSURED_ADDRESS_LABEL, value: insuredLine, key: "insured" },
      { label: MAILING_ADDRESS_LABEL, value: mailingLine, key: "mailing" },
    ],
  ];
  return (
    <dl
      className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4"
      data-ff-deal-package-shell=""
      data-ff-header-show-mailing={mailingDistinct ? "1" : "0"}
      data-ff-header-mailing-same={mailingDistinct ? "0" : "1"}
      data-ff-header-cols="name-stage,phones-owner,dob-activity,insured-mailing"
    >
      {columns.map((col, colIndex) => (
        <div
          key={col.map((row) => row.key).join("-")}
          className={colIndex === 0 ? "min-w-0 space-y-1 overflow-visible" : "min-w-0 space-y-1"}
          data-ff-header-col={colIndex + 1}
        >
          {col.map((row) => (
            <div key={row.key} className={row.key === "stage" ? "min-w-0 overflow-visible" : "min-w-0"}>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {row.label}
              </dt>
              <dd
                className={row.key === "stage" ? "min-w-0 overflow-visible text-navy" : "min-w-0 text-navy"}
                title={row.value}
                data-ff-header-address={row.key === "insured" || row.key === "mailing" ? row.key : undefined}
                data-ff-header-dob={row.key === "dob" ? "" : undefined}
                data-ff-header-stage={row.key === "stage" ? "" : undefined}
                data-ff-header-phones={row.key === "phones" ? "" : undefined}
              >
                {row.control ?? <span className="block truncate">{row.value}</span>}
              </dd>
            </div>
          ))}
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
