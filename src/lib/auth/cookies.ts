/** Cookie names only — safe for Edge middleware. Do not import db from here. */

export const SESSION_COOKIES = {
  role: "ff_role",
  actor: "ff_actor",
  actorId: "ff_actor_id",
  name: "ff_actor_name",
  modules: "ff_modules",
  mfa: "ff_mfa",
  mfaPending: "ff_mfa_pending",
  impersonatorId: "ff_impersonator_id",
  /** HMAC session. This cookie is the only auth authority. */
  session: "ff_session",
} as const;

export const ACTOR_COOKIE = SESSION_COOKIES.actorId;

export const SESSION_COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30,
};

export function sessionCookieOptions() {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  return secure ? { ...SESSION_COOKIE_OPTS, secure: true } : SESSION_COOKIE_OPTS;
}
