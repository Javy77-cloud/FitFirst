import { loginDesk } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_USERS } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; set?: string; reset?: string; mfareset?: string }>;
}) {
  const { error, set, reset, mfareset } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-3xl space-y-5">
        <div className="text-center sm:text-left">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">FitFirst desk</div>
          <h1 className="text-2xl font-semibold text-navy">Sign in as Admin or Agent</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Password is required, then 2-step (SMS stub, email stub, or TOTP). Javy and Maya
            are seeded enrolled; <code>FF_MFA_DEMO_BYPASS</code> (default on) skips the second
            prompt so Mac desk-test can open. Role is enforced in middleware — not CSS.
          </p>
        </div>

        {set ? (
          <p className="rounded-md bg-fit-green-bg px-3 py-2 text-sm text-fit-green">
            Password saved. Sign in with your email or username.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">
            {error === "frozen"
              ? "This login is frozen. Ask an Admin to unfreeze it."
              : error === "removed"
                ? "This login was removed."
                : error === "invite"
                  ? "This agent still needs the invite link to choose a password."
                  : error === "reset"
                    ? "That reset link is missing or expired."
                    : error === "mfa"
                      ? "Sign in again, then complete 2-step."
                      : error === "recover"
                        ? "That recovery link is missing or expired."
                    : "Email, username, or password did not match an active desk user."}
          </p>
        ) : null}
        {reset ? (
          <p className="rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">
            Password updated. Sign in with the new password.
          </p>
        ) : null}
        {mfareset ? (
          <p className="rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">
            2FA was cleared. Sign in, then enroll a new method before the desk opens.
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <form action={loginDesk} className="ff-card flex flex-col gap-3 p-5">
            <input type="hidden" name="who" value="admin" />
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-navy px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                Admin
              </span>
              <span className="text-xs text-muted-foreground">All book</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-navy">{DEMO_USERS.admin.name}</h2>
              <p className="text-sm text-muted-foreground">{DEMO_USERS.admin.email}</p>
            </div>
            <p className="text-sm text-navy/80">{DEMO_USERS.admin.summary}</p>
            <div>
              <Label className="text-sm">Password</Label>
              <Input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1"
              />
            </div>
            <Button type="submit" className="mt-auto">
              Sign in as Admin
            </Button>
            <p className="text-[11px] text-muted-foreground">Seed password: {DEMO_USERS.admin.password}</p>
          </form>

          <form action={loginDesk} className="ff-card flex flex-col gap-3 p-5">
            <input type="hidden" name="who" value="agent" />
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
                Agent
              </span>
              <span className="text-xs text-muted-foreground">Own book</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-navy">{DEMO_USERS.agent.name}</h2>
              <p className="text-sm text-muted-foreground">{DEMO_USERS.agent.email}</p>
            </div>
            <p className="text-sm text-navy/80">{DEMO_USERS.agent.summary}</p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Leads, contacts, deals, and policies she owns</li>
              <li>Send client email / SMS when the agency line is connected</li>
              <li>Calendar items assigned to her, plus company / training invites</li>
              <li>Pipeline deals on her book — no Admin settings</li>
            </ul>
            <div>
              <Label className="text-sm">Password</Label>
              <Input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1"
              />
            </div>
            <Button type="submit" className="mt-auto">
              Sign in as Agent
            </Button>
            <p className="text-[11px] text-muted-foreground">Seed password: {DEMO_USERS.agent.password}</p>
          </form>
        </div>

        <form action={loginDesk} className="ff-card space-y-3 p-5">
          <div>
            <h2 className="text-sm font-semibold text-navy">Email or username</h2>
            <p className="text-xs text-muted-foreground">
              Same demo users, plus any agent Admin created. After login the rail shows Admin ·
              all book or Agent · own book.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-sm">Email or username</Label>
              <Input name="email" required defaultValue={DEMO_USERS.admin.email} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Password</Label>
              <Input name="password" type="password" required className="mt-1" />
            </div>
          </div>
          <Button type="submit" variant="outline">
            Sign in
          </Button>
        </form>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Client self-serve (stub link, no desk password):{" "}
        <a href="/portal" className="text-primary hover:underline">
          Open client portal
        </a>
      </p>
    </div>
  );
}
