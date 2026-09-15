import { after } from "next/server";
import { releaseDueLeadFollowUps } from "@/lib/leads/apply-follow-up";

/** Fire follow-up due work after the response so desk chrome is not blocked on Neon writes. */
export function scheduleDueLeadFollowUpRelease() {
  after(() => {
    void releaseDueLeadFollowUps().catch(() => null);
  });
}
