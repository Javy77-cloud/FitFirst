import type { ShopCue } from "@/lib/quoting/ready-to-shop";
import { cn } from "@/lib/utils";

export function ReadyToShopCue({ cue }: { cue: ShopCue }) {
  return (
    <section
      data-ff-shop-cue={cue.kind}
      className={cn(
        "mb-4 rounded-md border px-3 py-2",
        cue.tone === "lock" && "border-fit-yellow/50 bg-fit-yellow-bg text-fit-yellow",
        cue.tone === "warn" && "border-fit-check/40 bg-fit-check-bg/60 text-navy",
        cue.tone === "go" && "border-fit-green/40 bg-fit-green-bg text-fit-green",
      )}
    >
      <p className="text-base font-semibold">{cue.title}</p>
      <p className="mt-0.5 text-sm">{cue.body}</p>
    </section>
  );
}
