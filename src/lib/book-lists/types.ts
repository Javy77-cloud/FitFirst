import type { HealthChipView } from "@/lib/health/model";
import type { HeatLevel } from "@/lib/desk/truth-strip";

export type BookHeat = HeatLevel;
export type BookSurface = "contacts" | "accounts" | "carriers" | "policies";
export type BookLayout = "stack" | "bands";

export type BookColumnId =
  | "touch"
  | "watch"
  | "current"
  | "rateable"
  | "limited"
  | "skip"
  | "now";

export type BookGlanceMetric = {
  id: string;
  label: string;
  value: string;
  tone?: "hot" | "cool" | "ok" | "skip";
};

export type BookPrimaryAction = {
  label: string;
  href: string;
};

export type BookCardFlags = {
  client?: boolean;
  openShops?: number;
  inForce?: number;
  writtenBook?: boolean;
  renewalSoon?: boolean;
  silent?: boolean;
  needsCare?: boolean;
  lapsed?: boolean;
};

export type BookGlanceCard = {
  id: string;
  surface: BookSurface;
  href: string;
  title: string;
  subtitle?: string;
  heat: BookHeat;
  column: BookColumnId;
  health?: HealthChipView | null;
  healthHint?: { level: "green" | "yellow" | "red"; tip: string } | null;
  riskBand?: "high" | "medium" | "low" | null;
  glance: BookGlanceMetric[];
  why: string;
  primaryAction: BookPrimaryAction;
  tags?: string[];
  phone?: string | null;
  email?: string | null;
  hay: string;
  lastTouchDays: number | null;
  flags: BookCardFlags;
  inboxCue?: string | null;
  inboxHref?: string | null;
};

export type BookLensId =
  | "clients"
  | "at_risk"
  | "open_shops"
  | "stale"
  | "prospects"
  | "book"
  | "rateable"
  | "skip"
  | "unused"
  | "written"
  | "renewal"
  | "silent"
  | "needs"
  | "in_force"
  | "lapse";

export type BookColumnMeta = {
  id: BookColumnId;
  label: string;
  tone: "terracotta" | "amber" | "navy" | "gray";
};

export const POLICY_COLUMNS: BookColumnMeta[] = [
  { id: "now", label: "Needs care now", tone: "terracotta" },
  { id: "watch", label: "Watch", tone: "amber" },
  { id: "current", label: "Current", tone: "navy" },
];
