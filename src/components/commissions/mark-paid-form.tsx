"use client";

import { markCommissionPaid } from "@/app/actions/commissions";

export function MarkPaidForm({
  commissionId,
  status,
}: {
  commissionId: string;
  status: string;
}) {
  if (status === "paid") return null;
  return (
    <form action={markCommissionPaid} className="mt-1">
      <input type="hidden" name="commissionId" value={commissionId} />
      <button
        type="submit"
        className="h-6 rounded-sm border border-fit-green bg-fit-green-bg px-1.5 text-[11px] font-medium text-fit-green"
      >
        Mark paid
      </button>
    </form>
  );
}
