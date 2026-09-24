import type { HealthChipView } from "@/lib/health/model";
import type { HeatLevel } from "@/lib/desk/truth-strip";

export type BookHeat = HeatLevel;
export type BookSurface = "contacts" | "accounts" | "carriers" | "policies";
export type BookLayout = "stack" | "bands" | "list";

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

export type BookFamily = "pc" | "life" | "health";

export type BookCardFlags = {
  client?: boolean;
  openShops?: number;
  inForce?: number;
  writtenBook?: boolean;
  renewalSoon?: boolean;
  silent?: boolean;
  needsCare?: boolean;
  lapsed?: boolean;
  hasPhone?: boolean;
  hasEmail?: boolean;
  recentTouch?: boolean;
  neverTouched?: boolean;
  portalContact?: boolean;
  family?: BookFamily;
  /** Lines this carrier actually writes or has in force. */
  families?: BookFamily[];
  openClaims?: number;
};

export type BookCardFact = {
  id: string;
  label: string;
  href?: string | null;
  tone?: "hot" | "ok" | "cool";
};

/** Fixed glance columns so the same tag starts on the same vertical line. */
export type BookCueColumn = {
  id: string;
  label: string;
};

export type BookCardAction = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
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
  /** Center glance. Two cues at most — same rule as Deals. */
  mid?: string | null;
  midHref?: string | null;
  /** Aligned tags (carrier posture, last use). Replaces the centered mid line. */
  columns?: BookCueColumn[] | null;
  /** Short chips under the name. Four at most. */
  facts?: BookCardFact[];
  /** One quiet line under the name. Only when it earns a look. */
  peek?: string | null;
  actions?: BookCardAction[];
  primaryAction: BookPrimaryAction;
  tags?: string[];
  phone?: string | null;
  email?: string | null;
  hay: string;
  lastTouchDays: number | null;
  flags: BookCardFlags;
  inboxCue?: string | null;
  inboxHref?: string | null;
  /**
   * Policies stack only. Dates for the render-time "Renewal agreed" stamp.
   * Visibility is not stored here — the stack card computes it.
   */
  renewalAgreed?: {
    handled: boolean;
    /** policies.renewal_date. Swap the source for renewalDateFor(policy) later. */
    renewalDate?: string | null;
    renewedEffective?: string | null;
    termEffective?: string | null;
    termExpiration?: string | null;
    priorExpiration?: string | null;
    asOf?: Date;
  } | null;
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
