"use client";

import { switchActor } from "@/app/actions/session";
import type { Actor } from "@/lib/auth/rbac";

export function ActorSwitcher({
  actor,
  users,
}: {
  actor: Actor;
  users: Actor[];
}) {
  return (
    <form action={switchActor} className="space-y-1">
      <label htmlFor="ff-actor" className="block text-[10px] uppercase tracking-wide text-sidebar-foreground/50">
        Acting as
      </label>
      <select
        id="ff-actor"
        name="userId"
        defaultValue={actor.id}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-1 text-[12px] text-sidebar-foreground"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} · {user.role === "admin" ? "Admin" : "Agent"}
          </option>
        ))}
      </select>
    </form>
  );
}
