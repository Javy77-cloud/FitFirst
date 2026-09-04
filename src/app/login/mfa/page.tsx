import { verifyLoginMfa, logoutDesk } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireMfaChallengeSession } from "@/lib/auth/guards";
import { MFA_METHOD_LABEL, isMfaMethod } from "@/lib/auth/mfa";
import { latestOpenChallenge } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export default async function LoginMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireMfaChallengeSession();
  const { error } = await searchParams;
  const user = session.user;
  if (!user) return null;
  const method = isMfaMethod(user.mfaMethod) ? user.mfaMethod : "totp";
  const challenge = method === "totp" ? null : await latestOpenChallenge(user.id, "verify");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Second factor</div>
          <h1 className="text-2xl font-semibold text-navy">Confirm it is you</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.name} · {MFA_METHOD_LABEL[method]}. Password already matched.
          </p>
        </div>
        {error ? (
          <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">That 2FA code did not match.</p>
        ) : null}
        {challenge?.stubCode ? (
          <div className="ff-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stub code</div>
            <p className="text-2xl font-semibold tracking-widest text-navy">{challenge.stubCode}</p>
            <p className="text-xs text-muted-foreground">Would have gone to {challenge.destination}.</p>
          </div>
        ) : null}
        <form action={verifyLoginMfa} className="ff-card space-y-3 p-5">
          <div>
            <Label className="text-sm">6-digit code</Label>
            <Input name="code" inputMode="numeric" autoComplete="one-time-code" required className="mt-1" />
          </div>
          <Button type="submit">Verify and open desk</Button>
        </form>
        <form action={logoutDesk}>
          <button type="submit" className="text-sm text-primary hover:underline">
            Back to sign in
          </button>
        </form>
      </div>
    </div>
  );
}
