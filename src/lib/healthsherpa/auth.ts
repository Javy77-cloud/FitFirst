import { timingSafeEqual } from "node:crypto";
import { parseApiKeyHeader } from "@/lib/developer-hub/keys";
import { verifyOrgApiKey } from "@/lib/developer-hub/store";
import { loadHealthSherpaInboundKey } from "./vault";

function secretsEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** X-API-Key (or Bearer / X-FitFirst-Key) against the inbound vault secret or an org API key. */
export async function authorizeHealthSherpaWebhook(request: Request): Promise<boolean> {
  const presented = parseApiKeyHeader(request);
  if (!presented) return false;
  const inbound = await loadHealthSherpaInboundKey();
  if (inbound && secretsEqual(presented, inbound)) return true;
  try {
    const org = await verifyOrgApiKey(presented);
    return Boolean(org);
  } catch {
    return false;
  }
}
