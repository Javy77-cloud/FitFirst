import Link from "next/link";
import { Calendar, CalendarDays, GraduationCap, ListTodo, Mail, Phone } from "lucide-react";
import {
  DEAL_ACTIVITY_TONES,
  DEAL_TODAY_ACTIVITY_CHIPS,
  formatTodayActivityDate,
  todayActivityCalendarHref,
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
  now,
}: {
  counts: Record<DealTodayActivityType, number>;
  active?: DealTodayActivityType | null;
  now?: Date;
}) {
  const dated = formatTodayActivityDate(now);
  return (
    <aside
      className="overflow-visible bg-transparent px-1 py-3"
      data-testid="deal-today-activity"
    >
      <div className="flex items-start justify-center gap-2">
        <Link
          href={todayActivityCalendarHref()}
          className="mt-0.5 rounded-md p-1 text-navy/70 hover:bg-muted hover:text-navy"
          title="Open work queue"
          aria-label="Open work queue"
          data-testid="deal-today-calendar"
        >
          <CalendarDays className="size-4" aria-hidden />
        </Link>
        <div className="text-center">
          <p className="text-[13px] font-semibold tracking-wide text-navy">Today&apos;s Activity</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground" data-testid="deal-today-date">
            {dated}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-nowrap items-center justify-center gap-2.5 overflow-x-auto overflow-y-visible py-2">
        {DEAL_TODAY_ACTIVITY_CHIPS.map((chip) => {
          const on = active === chip.id;
          const tone = DEAL_ACTIVITY_TONES[chip.id];
          const Icon = CHIP_ICONS[chip.id];
          return (
            <Link
              key={chip.id}
              href={todayActivityWorkHref(chip.id)}
              className={
                on
                  ? "inline-flex shrink-0 flex-col items-center rounded-lg px-3.5 py-2 shadow-[0_4px_10px_rgba(16,28,52,0.16)] transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:z-10 hover:shadow-[0_8px_18px_rgba(16,28,52,0.20)]"
                  : "inline-flex shrink-0 flex-col items-center rounded-lg px-3.5 py-2 shadow-[0_2px_6px_rgba(16,28,52,0.10)] transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:z-10 hover:shadow-[0_8px_18px_rgba(16,28,52,0.18)]"
              }
              style={{
                color: tone.chipFg,
                backgroundImage: `linear-gradient(180deg, ${tone.chipBg} 0%, ${tone.chipBgLight} 100%)`,
                border: `1px solid ${tone.chipFg}55`,
                outline: on ? `2px solid ${tone.chipFg}` : undefined,
                outlineOffset: on ? "1px" : undefined,
              }}
              data-testid={`deal-today-${chip.id}`}
              data-tone={chip.tone}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="text-xs font-semibold leading-none">{chip.label}</span>
              </span>
              <span className="mt-1 text-[18px] font-bold leading-none tabular-nums">{counts[chip.id]}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
