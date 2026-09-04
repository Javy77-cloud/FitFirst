import { formatMoney } from "@/lib/domain";
import { momDelta } from "@/lib/home/kpis";

export function momLabel(thisVal: number, lastVal: number, money = false): string {
  const { change, pct } = momDelta(thisVal, lastVal);
  if (lastVal === 0 && thisVal === 0) return "Flat vs last month";
  if (lastVal === 0) return "No baseline last month";
  const abs = money ? formatMoney(Math.abs(change)) : new Intl.NumberFormat("en-US").format(Math.abs(change));
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  if (change === 0) return "Flat vs last month";
  return `${sign}${abs}${pct == null ? "" : ` · ${Math.abs(pct)}%`} vs last month`;
}

export function momTone(thisVal: number, lastVal: number, invert = false): string {
  if (thisVal === lastVal) return "text-muted-foreground";
  const up = thisVal > lastVal;
  const good = invert ? !up : up;
  return good ? "text-fit-green" : "text-fit-flag";
}
