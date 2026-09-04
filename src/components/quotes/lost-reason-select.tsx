import { LOST_BUSINESS_REASON_LABELS, LOST_BUSINESS_REASONS } from "@/lib/domain";

export function LostReasonSelect({
  name = "lostReason",
  defaultValue,
  required,
  label = "Lost / declined reason",
}: {
  name?: string;
  defaultValue?: string | null;
  required?: boolean;
  label?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
      >
        <option value="">{required ? "Pick a reason" : "No reason yet"}</option>
        {LOST_BUSINESS_REASONS.map((reason) => (
          <option key={reason} value={reason}>
            {LOST_BUSINESS_REASON_LABELS[reason]}
          </option>
        ))}
      </select>
    </div>
  );
}
