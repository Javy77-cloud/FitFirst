"use client";

import { markCommissionStatus } from "@/app/actions/commissions";
import { COMMISSION_STATUSES } from "@/lib/domain";

export function CommissionStatusForm({
  commissionId,
  status,
}: {
  commissionId: string;
  status: string;
}) {
  return (
    <form action={markCommissionStatus} className="mt-1">
      <input type="hidden" name="commissionId" value={commissionId} />
      <select
        name="status"
        defaultValue={status}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-6 rounded-sm border border-input bg-card px-1 text-[11px]"
      >
        {COMMISSION_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </form>
  );
}
