import { CLAIM_CAUSES, CLAIM_REPORT_CHANNELS, CLAIM_STATUSES } from "@/lib/domain";
import {
  CLAIM_CAUSE_LABELS,
  CLAIM_CHANNEL_LABELS,
  CLAIM_STATUS_LABELS,
} from "@/lib/claims";

export const fieldClass =
  "mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ClaimCauseSelect({
  name = "causeType",
  defaultValue = "water",
}: {
  name?: string;
  defaultValue?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue} className={fieldClass}>
      {CLAIM_CAUSES.map((cause) => (
        <option key={cause} value={cause}>
          {CLAIM_CAUSE_LABELS[cause]}
        </option>
      ))}
    </select>
  );
}

export function ClaimChannelSelect({
  name = "reportedHow",
  defaultValue = "phone",
}: {
  name?: string;
  defaultValue?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue} className={fieldClass}>
      {CLAIM_REPORT_CHANNELS.map((channel) => (
        <option key={channel} value={channel}>
          {CLAIM_CHANNEL_LABELS[channel]}
        </option>
      ))}
    </select>
  );
}

export function ClaimStatusSelect({
  name = "status",
  defaultValue = "inquiry",
}: {
  name?: string;
  defaultValue?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue} className={fieldClass}>
      {CLAIM_STATUSES.map((status) => (
        <option key={status} value={status}>
          {CLAIM_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
