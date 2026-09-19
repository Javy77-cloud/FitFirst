import Link from "next/link";
import { Calendar, GraduationCap, ListTodo, MessageSquare, Phone } from "lucide-react";
import {
  DEAL_ACTIVITY_TONES,
  DEAL_TODAY_ACTIVITY_CHIPS,
  todayActivityWorkHref,
  type DealTodayActivityType,
} from "@/lib/deals/pipeline-desk";

const CHIP_ICONS = {
  task: ListTodo,
  call: Phone,
  email: MessageSquare,
  meeting: Calendar,
  training: GraduationCap,
} as const;

export function TodayActivityStrip({
  counts,
  active,
  basePath = "/deals",
}: {
  counts: Record<DealTodayActivityType, number>;
  active?: DealTodayActivityType | null;
  basePath?: "/deals" | "/renewals";
}) {
  return (
    <aside className="deal-today-strip bg-transparent" data-testid="deal-today-activity">
      <div className="deal-today-chips">
        {DEAL_TODAY_ACTIVITY_CHIPS.map((chip) => {
          const on = active === chip.id;
          const tone = DEAL_ACTIVITY_TONES[chip.id];
          const Icon = CHIP_ICONS[chip.id];
          return (
            <Link
              key={chip.id}
              href={todayActivityWorkHref(chip.id, basePath)}
              className="deal-today-item inline-flex shrink-0 items-center justify-center text-center"
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
              <span className="deal-today-chip">
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="deal-today-chip-count">{counts[chip.id]}</span>
                <span className="deal-today-chip-word">{chip.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
