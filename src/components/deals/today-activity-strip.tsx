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
      className="deal-today-strip inline-grid max-w-full justify-items-center bg-transparent"
      data-testid="deal-today-activity"
    >
      <div className="deal-today-heading flex w-full flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center gap-2">
          <Link
            href={todayActivityCalendarHref()}
            className="rounded-md p-1.5 text-navy/70 hover:bg-muted hover:text-navy"
            title="Open work queue"
            aria-label="Open work queue"
            data-testid="deal-today-calendar"
          >
            <CalendarDays className="size-6" aria-hidden />
          </Link>
          <p className="text-base font-semibold tracking-wide text-navy">Today&apos;s Activity</p>
        </div>
        <p className="mt-1 text-[16px] text-muted-foreground" data-testid="deal-today-date">
          {dated}
        </p>
      </div>
      <div className="deal-today-chips mt-2 flex flex-nowrap items-center justify-center gap-2 overflow-visible">
        {DEAL_TODAY_ACTIVITY_CHIPS.map((chip) => {
          const on = active === chip.id;
          const tone = DEAL_ACTIVITY_TONES[chip.id];
          const Icon = CHIP_ICONS[chip.id];
          return (
            <Link
              key={chip.id}
              href={todayActivityWorkHref(chip.id)}
              className="deal-today-chip inline-flex shrink-0 items-center gap-1.5 px-2.5"
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
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="text-[16px] font-semibold leading-none">{chip.label}</span>
              <span className="text-[23px] font-bold leading-none tabular-nums">{counts[chip.id]}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
