import Link from "next/link";
import { Phone } from "lucide-react";
import type { SoftphoneTarget } from "@/components/softphone/softphone-context";
import { cn } from "@/lib/utils";

export function CallButton({
  target,
  label = "Phone",
  size = "sm",
}: {
  target: SoftphoneTarget;
  label?: string;
  size?: "xs" | "sm";
}) {
  return (
    <Link
      href={`/tasks/${target.activityId}?softphone=1#desk-softphone`}
      data-softphone-trigger={target.activityId}
      data-softphone-target={JSON.stringify(target)}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1 rounded-md bg-primary px-2.5 font-medium text-primary-foreground hover:bg-primary/80",
        size === "xs" ? "h-6 text-xs" : "h-7 text-[0.8rem]",
      )}
    >
      <Phone className="size-3.5" />
      {label}
    </Link>
  );
}
