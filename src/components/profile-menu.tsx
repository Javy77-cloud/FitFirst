"use client";

import Link from "next/link";
import { logoutDesk } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupport } from "@/components/support/support-context";
import type { Actor } from "@/lib/auth/rbac";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function ProfileMenu({
  actor,
  users,
  signedIn,
  canSwitchRole,
  impersonatorName,
  isImpersonating,
}: {
  actor: Actor;
  users: Actor[];
  signedIn: boolean;
  canSwitchRole: boolean;
  impersonatorName: string | null;
  isImpersonating: boolean;
}) {
  const { openSupport } = useSupport();

  if (!signedIn || !actor.id) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-navy hover:bg-secondary"
      >
        Sign in
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={`${actor.name} · ${actor.role === "admin" ? "Admin" : "Agent"}`}
        className="inline-flex size-10 items-center justify-center rounded-full bg-[#1d4e89] text-sm font-semibold text-white hover:bg-[#163a68]"
      >
        <span aria-hidden>{initials(actor.name)}</span>
        <span className="sr-only">Account menu for {actor.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="text-sm font-semibold text-navy">{actor.name}</div>
            <div className="text-xs font-normal text-muted-foreground">
              {isImpersonating
                ? `Viewing as ${actor.role === "admin" ? "Admin" : "Agent"}`
                : actor.role === "admin"
                  ? "Admin · full desk"
                  : "Agent · own book"}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/settings/profile" />}>Edit Profile</DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/settings/security" />}>Password</DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/me" />}>Settings</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openSupport()}>Support</DropdownMenuItem>
        </DropdownMenuGroup>
        {canSwitchRole && users.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Switch role</DropdownMenuLabel>
              {isImpersonating && impersonatorName ? (
                <p className="px-1.5 pb-1 text-xs text-muted-foreground">
                  Started as {impersonatorName}. Every switch is written to the audit trail.
                </p>
              ) : (
                <p className="px-1.5 pb-1 text-xs text-muted-foreground">
                  View the desk as another login. Logged for audit.
                </p>
              )}
              <form action="/api/session" method="post" className="px-1.5 pb-1.5">
                <label htmlFor="ff-switch-role" className="sr-only">
                  Switch role
                </label>
                <select
                  id="ff-switch-role"
                  name="userId"
                  defaultValue={actor.id}
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  className="w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {user.role === "admin" ? "Admin" : "Agent"}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="mt-1.5 w-full rounded-md border border-border px-2 py-1 text-xs font-medium text-navy hover:bg-secondary"
                >
                  Switch role
                </button>
              </form>
            </DropdownMenuGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <form action={logoutDesk}>
          <button
            type="submit"
            className="flex w-full items-center rounded-md px-1.5 py-1 text-sm text-destructive hover:bg-destructive/10"
          >
            Sign Out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
