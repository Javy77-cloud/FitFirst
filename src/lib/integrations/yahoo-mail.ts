import { liveAccessToken } from "./oauth-exchange";
import { loadByoConnection } from "./oauth-store";

export async function yahooMailboxPing(): Promise<{
  email: string | null;
  name: string | null;
}> {
  const token = await liveAccessToken("yahoo");
  if (!token) throw new Error("Yahoo Mail is not connected.");
  const res = await fetch("https://api.login.yahoo.com/openid/v1/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  const info = (await res.json()) as { email?: string; name?: string; error?: { description?: string } };
  if (!res.ok) {
    throw new Error(info.error?.description || `Yahoo userinfo failed (${res.status}).`);
  }
  const row = await loadByoConnection("yahoo");
  return {
    email: info.email ?? row?.tokenAccountEmail ?? null,
    name: info.name ?? row?.accountLabel ?? null,
  };
}
