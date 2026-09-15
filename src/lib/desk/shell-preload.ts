import { currentDeskSession, getActor } from "@/lib/auth/session";
import { loadHeaderNotificationState } from "@/lib/db/header-alerts";
import { getStoredNavLayout } from "@/lib/db/nav-prefs";
import { listUsers } from "@/lib/db/queries";

/** Start shared desk chrome queries so page data and AppShell overlap. */
export function preloadDeskShell() {
  void currentDeskSession().then((session) => {
    void getStoredNavLayout(session.userId, { isAdmin: session.isAdmin });
  });
  void getActor();
  void listUsers();
  void loadHeaderNotificationState();
}
