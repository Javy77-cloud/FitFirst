import { MASTER_TO_FILL_STEPS } from "@/lib/quoting/fill-path";
import { cn } from "@/lib/utils";

export function FillPathStepper({ current }: { current: number }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-5" aria-label="Master sheet to Fill">
      {MASTER_TO_FILL_STEPS.map((step) => {
        const state = step.n < current ? "done" : step.n === current ? "now" : "todo";
        return (
          <li
            key={step.id}
            data-step={step.id}
            data-state={state}
            className={cn(
              "rounded-md border px-3 py-2",
              state === "now" && "border-fit-check bg-fit-check-bg/50",
              state === "done" && "border-fit-green/40 bg-fit-green-bg/50",
              state === "todo" && "border-border bg-card",
            )}
          >
            <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {step.n} · {state === "now" ? "Now" : state === "done" ? "Done" : "Next"}
            </p>
            <p className="text-sm font-semibold text-navy">{step.label}</p>
            <p className="mt-0.5 text-helper text-muted-foreground">{step.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
