import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** In-dialog hold: big spinner + sweeping bar so the wait is obvious. */
export function WaitHold({
  title,
  message,
  className,
  ...props
}: {
  title: string;
  message?: string;
  className?: string;
} & ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-navy/15 bg-navy/5 px-3.5 py-3",
        className,
      )}
      data-ff-wait-hold=""
      aria-live="polite"
      aria-busy="true"
      {...props}
    >
      <div className="flex items-center gap-3">
        <span
          className="size-8 shrink-0 animate-spin rounded-full border-[3px] border-navy/15 border-t-navy"
          aria-hidden="true"
          data-ff-wait-hold-spinner=""
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-navy">{title}</p>
          {message ? <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{message}</p> : null}
        </div>
      </div>
      <div
        className="ff-wait-hold-track"
        role="progressbar"
        aria-label={title}
        data-ff-wait-hold-bar=""
      >
        <span className="ff-wait-hold-bar" />
      </div>
    </div>
  );
}

/** Tiny spinner for pending buttons (same motion language as WaitHold). */
export function WaitSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      aria-hidden="true"
      data-ff-wait-spinner=""
    />
  );
}

/**
 * Shared processing cue for any wait that used to be static faded text.
 * Spinner stays visible even when a parent button is disabled.
 */
export function ProcessingLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} data-ff-processing="">
      <WaitSpinner />
      <span>{children}</span>
    </span>
  );
}
