/** Cookie names only — safe for Edge middleware. Do not import db from here. */

export const SESSION_COOKIES = {
  role: "ff_role",
  actor: "ff_actor",
  actorId: "ff_actor_id",
  name: "ff_actor_name",
  mfa: "ff_mfa",
} as const;

export const ACTOR_COOKIE = SESSION_COOKIES.actorId;

export const SESSION_COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30,
};
