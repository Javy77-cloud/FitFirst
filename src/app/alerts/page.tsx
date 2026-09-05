import { redirect } from "next/navigation";
import { NOTIFICATION_BOARD_HREF } from "@/lib/desk/notifications";

export const dynamic = "force-dynamic";

/** Legacy Alerts URL — same in-desk board, one screen. */
export default function AlertsAliasPage() {
  redirect(NOTIFICATION_BOARD_HREF);
}
