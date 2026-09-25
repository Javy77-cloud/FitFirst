import { loginDesk } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; set?: string; reset?: string; mfareset?: string }>;
}) {
  const { error, set, reset, mfareset } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center sm:text-left">
          <div className="text-caption uppercase tracking-wide text-muted-foreground">FitFirst desk</div>
          <h1 className="text-2xl font-semibold text-navy">Sign in</h1>

        </div>

        {set ? (
          <p className="rounded-md bg-fit-green-bg px-3 py-2 text-sm text-fit-green">
            Password saved. Sign in with your email or username.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red" role="alert">
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
                        : error === "session"
                          ? "Desk session secret is not configured. Set SESSION_SECRET before signing in."
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

        <form action={loginDesk} className="ff-card space-y-3 p-5">
          <div>
            <h2 className="text-sm font-semibold text-navy">Email or username</h2>

          </div>
          <div className="grid gap-3">
            <div>
              <Label className="text-sm" htmlFor="desk-login">
                Email or username
              </Label>
              <Input id="desk-login" name="email" required autoComplete="username" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm" htmlFor="desk-password">
                Password
              </Label>
              <Input
                id="desk-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1"
              />
            </div>
          </div>
          <Button type="submit">Sign in</Button>
        </form>
      </div>
    </div>
  );
}
