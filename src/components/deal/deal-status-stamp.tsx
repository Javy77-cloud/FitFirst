import { dealStampLabel, type DealStampStage } from "@/lib/deals/status-stamp";

export function DealStatusStamp({ stage }: { stage: DealStampStage | null }) {
  if (!stage) return null;
  return (
    <div
      className="ff-deal-status-stamp"
      data-ff-deal-status-stamp={stage}
      aria-hidden
    >
      <span className="ff-deal-status-stamp-ink">{dealStampLabel(stage)}</span>
    </div>
  );
}
