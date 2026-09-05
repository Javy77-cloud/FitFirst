import { createHash, randomBytes } from "node:crypto";

export const DEMO_ORG_API_KEY = process.env.DEVHUB_DEMO_API_KEY ?? "ffk_devhub_demo";

export function hashOrgApiKey(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateOrgApiKey(): { secret: string; prefix: string } {
  const secret = `ffk_${randomBytes(24).toString("hex")}`;
  return { secret, prefix: secret.slice(0, 11) };
}

export function prefixFromSecret(secret: string): string {
  return secret.slice(0, 11);
}

export function parseApiKeyHeader(request: Request): string | null {
  const bearer = request.headers.get("authorization");
  if (bearer) {
    const match = /^Bearer\s+(\S+)/i.exec(bearer.trim());
    if (match?.[1]) return match[1];
  }
  const named = request.headers.get("x-api-key") ?? request.headers.get("x-fitfirst-key");
  return named?.trim() || null;
}
