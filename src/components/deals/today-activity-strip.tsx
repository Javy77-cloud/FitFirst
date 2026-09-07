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
      className="overflow-visible bg-transparent px-1 py-4"
      data-testid="deal-today-activity"
    >
      <div className="flex items-start gap-2.5">
        <Link
          href={todayActivityCalendarHref()}
          className="mt-0.5 rounded-md p-1.5 text-navy/70 hover:bg-muted hover:text-navy"
          title="Open work queue"
          aria-label="Open work queue"
          data-testid="deal-today-calendar"
        >
          <CalendarDays className="size-5" aria-hidden />
        </Link>
        <div>
          <p className="text-sm font-semibold tracking-wide text-navy">Today&apos;s Activity</p>
          <p className="mt-1 text-[13px] text-muted-foreground" data-testid="deal-today-date">
            {dated}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-nowrap items-center gap-3.5 overflow-x-auto overflow-y-visible py-4">
        {DEAL_TODAY_ACTIVITY_CHIPS.map((chip) => {
          const on = active === chip.id;
          const tone = DEAL_ACTIVITY_TONES[chip.id];
          const Icon = CHIP_ICONS[chip.id];
          return (
            <Link
              key={chip.id}
              href={todayActivityWorkHref(chip.id)}
              className="deal-today-chip inline-flex shrink-0 flex-col items-center rounded-xl px-4 py-2.5 hover:z-10"
              style={{
                color: tone.chipFg,
                ["--chip-top" as string]: tone.chipBgLight,
                ["--chip-mid" as string]: tone.chipBg,
                ["--chip-bottom" as string]: tone.chipBgDark,
                ["--chip-fg" as string]: tone.chipFg,
              }}
              data-on={on ? "1" : "0"}
              data-testid={`deal-today-${chip.id}`}
              data-tone={chip.tone}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="text-[13px] font-semibold leading-none">{chip.label}</span>
              </span>
              <span className="mt-1.5 text-[20px] font-bold leading-none tabular-nums">{counts[chip.id]}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
