import Link from "next/link";
import { Calendar, GraduationCap, ListTodo, Mail, Phone } from "lucide-react";
import {
  DEAL_ACTIVITY_TONES,
  DEAL_TODAY_ACTIVITY_CHIPS,
  todayActivityWorkHref,
  type DealTodayActivityType,
} from "@/lib/deals/pipeline-desk";

const CHIP_ICONS = {
  task: ListTodo,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  training: GraduationCap,
} as const;

export function TodayActivityStrip({
  counts,
  active,
}: {
  counts: Record<DealTodayActivityType, number>;
  active?: DealTodayActivityType | null;
}) {
  return (
    <aside
      className="flex min-h-[5.5rem] flex-col items-center justify-center bg-transparent px-2 py-1"
      data-testid="deal-today-activity"
    >
      <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Today&apos;s Activity
      </p>
      <div className="mt-2 flex flex-nowrap items-center justify-center gap-1.5 overflow-x-auto">
        {DEAL_TODAY_ACTIVITY_CHIPS.map((chip) => {
          const on = active === chip.id;
          const tone = DEAL_ACTIVITY_TONES[chip.id];
          const Icon = CHIP_ICONS[chip.id];
          return (
            <Link
              key={chip.id}
              href={todayActivityWorkHref(chip.id)}
              className="inline-flex shrink-0 flex-col items-center rounded-md px-2.5 py-1.5 transition-transform hover:-translate-y-1"
              style={{
                backgroundColor: tone.chipBg,
                color: tone.chipFg,
                boxShadow: on ? `0 0 0 2px ${tone.chipFg}` : undefined,
              }}
              data-testid={`deal-today-${chip.id}`}
              data-tone={chip.tone}
            >
              <span className="inline-flex items-center gap-1">
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="text-[11px] font-medium leading-none">{chip.label}</span>
              </span>
              <span className="mt-0.5 text-[16px] font-bold leading-none tabular-nums">{counts[chip.id]}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
