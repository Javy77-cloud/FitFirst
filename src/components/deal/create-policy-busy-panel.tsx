import {
  CREATE_POLICY_BUSY_COPY,
  CREATE_POLICY_BUSY_TITLE,
} from "@/lib/policy/dec-prompt";

/** Compact in-dialog hold — same bouncing dots as master-sheet Fill. */
export function CreatePolicyBusyPanel() {
  return (
    <div
      className="space-y-2.5 rounded-md border border-navy/10 bg-navy/5 px-3 py-2.5"
      data-ff-create-policy-busy=""
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-duration:0.9s] [animation-delay:-0.3s]" />
          <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-duration:0.9s] [animation-delay:-0.15s]" />
          <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-duration:0.9s]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">{CREATE_POLICY_BUSY_TITLE}</p>
          <p className="text-xs text-muted-foreground">{CREATE_POLICY_BUSY_COPY}</p>
        </div>
      </div>
      <div
        className="h-0.5 overflow-hidden rounded-full bg-navy/10"
        role="progressbar"
        aria-label={CREATE_POLICY_BUSY_TITLE}
      >
        <div className="h-full w-2/5 origin-left animate-pulse rounded-full bg-navy/55" />
      </div>
    </div>
  );
}
