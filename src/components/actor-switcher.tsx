"use client";

import type { Actor } from "@/lib/auth/rbac";

export function ActorSwitcher({
  actor,
  users,
}: {
  actor: Actor;
  users: Actor[];
}) {
  return (
    <form action="/api/session" method="post" className="space-y-1.5">
      <label htmlFor="ff-actor" className="block text-caption uppercase tracking-wide text-sidebar-foreground/75">
        Acting as
      </label>
      <select
        key={actor.id}
        id="ff-actor"
        name="userId"
        defaultValue={actor.id}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-1 text-caption text-sidebar-foreground"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} · {user.role === "admin" ? "Admin" : "Agent"}
          </option>
        ))}
      </select>
      <div className="text-caption text-sidebar-foreground/90">
        {actor.name}
        {" · "}
        {actor.role === "admin" ? "Admin · full desk" : "Agent · own book"}
      </div>
      <button
        type="submit"
        className="w-full rounded-md border border-sidebar-border px-2 py-1 text-caption text-sidebar-foreground/90 hover:bg-sidebar-accent"
      >
        Switch role
      </button>
    </form>
  );
}
