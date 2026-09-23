import { loadAgencyBrand } from "@/lib/desk/brand";
import { getStoredNavLayout } from "@/lib/db/nav-prefs";
import { getDefaultSignature } from "@/lib/db/brand-queries";
import { currentDeskSession } from "@/lib/auth/session";

/** Prefer the agent's personal signature, then live agency default, then brand settings. */
export async function resolveOutboundEmailSignature(): Promise<string> {
  const session = await currentDeskSession();
  if (session.signedIn && session.userId) {
    const layout = await getStoredNavLayout(session.userId);
    const personal = layout.personal?.emailSignature?.trim();
    if (personal) return personal;
  }
  const live = await getDefaultSignature();
  const liveBody = (live?.bodyEn ?? "").trim();
  if (liveBody) return liveBody;
  const brand = await loadAgencyBrand();
  return (brand.emailSignature ?? "").trim();
}
