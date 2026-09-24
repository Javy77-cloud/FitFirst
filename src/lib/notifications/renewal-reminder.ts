/**
 * Read-only renewal reminder clock.
 *
 * Callers that build panel cards use this to decide the day. They do not
 * insert alerts. `sync-panel` stays the single writer for notification rows.
 */

import { isRenewalSilenceWindow } from "@/lib/notifications/panel";
import {
  daysUntilRenewal,
  renewalDateFor,
  renewsOnPhrase,
  type RenewalDateInput,
} from "@/lib/policies/renewal-date";
import { autopilotBandFor, type AutopilotBand } from "@/lib/renewal/autopilot";

export type RenewalReminderMatch = {
  renewalOn: string | null;
  daysUntil: number | null;
  /** "Renews Jan 1, 2027" when a renewal day exists. */
  renewsLabel: string | null;
  /**
   * Same candidate gate as renewal-silence reminders:
   * the 38–52 day quiet window, or inside 30 days.
   */
  silenceReminder: boolean;
  autopilotBand: AutopilotBand | null;
};

export function renewalReminderMatch(policy: RenewalDateInput, asOf: Date): RenewalReminderMatch {
  const renewalOn = renewalDateFor(policy);
  const daysUntil = daysUntilRenewal(policy, asOf);
  return {
    renewalOn,
    daysUntil,
    renewsLabel: renewalOn ? renewsOnPhrase(renewalOn) : null,
    silenceReminder: daysUntil != null && (isRenewalSilenceWindow(daysUntil) || daysUntil < 30),
    autopilotBand: daysUntil == null ? null : autopilotBandFor(daysUntil),
  };
}
