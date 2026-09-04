import { changeOwnPassword } from "@/app/actions/mfa";
import { MfaEnrollPanel } from "@/components/auth/mfa-enroll-panel";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSignedInAllowMfaSetup } from "@/lib/auth/guards";
import { MFA_METHOD_LABEL, isMfaMethod, mfaDemoBypassEnabled } from "@/lib/auth/mfa";
import { SEED_TOTP_SECRET } from "@/lib/auth/totp";
import { latestOpenChallenge } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string; error?: string; saved?: string }>;
}) {
  const session = await requireSignedInAllowMfaSetup();
  const params = await searchParams;
  const user = session.user;
  if (!user) return null;
  const challenge = await latestOpenChallenge(user.id, "enroll");
  const method = isMfaMethod(params.method)
    ? params.method
    : isMfaMethod(user.mfaMethod)
      ? user.mfaMethod
      : null;

  return (
    <SettingsShell title="Security" current="security" allowMfaPending>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Password plus one second factor. SMS and email are stubs — the desk prints the code. TOTP
        is a real authenticator secret. Seed logins stay enrolled so 7pm desk-test is not blocked.
      </p>

      {params.saved === "password" ? (
        <p className="mb-4 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">Password updated.</p>
      ) : null}
      {params.error === "password" ? (
        <p className="mb-4 rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">
          New password must be at least 4 characters and match the confirmation.
        </p>
      ) : null}
      {params.error === "current" ? (
        <p className="mb-4 rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">
          Current password did not match.
        </p>
      ) : null}

      <div className="ff-card mb-4 space-y-2 p-4">
        <h2 className="text-sm font-semibold text-navy">2FA status</h2>
        <p className="text-sm text-navy">
          {user.mfaEnrolled
            ? `Enrolled · ${isMfaMethod(user.mfaMethod) ? MFA_METHOD_LABEL[user.mfaMethod] : user.mfaMethod}`
            : "Not enrolled — the desk stays gated until you finish a method."}
        </p>
        {user.mfaDemoBypass && mfaDemoBypassEnabled() ? (
          <p className="text-xs text-muted-foreground">
            Demo bypass is on for this seed login. Set <code>FF_MFA_DEMO_BYPASS=0</code> to prompt
            for a TOTP code after password. Seed secret: <code>{SEED_TOTP_SECRET}</code>
          </p>
        ) : null}
      </div>

      <form action={changeOwnPassword} className="ff-card mb-4 space-y-3 p-4">
        <h2 className="text-sm font-semibold text-navy">Change password</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Current</Label>
            <Input name="currentPassword" type="password" required className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">New</Label>
            <Input name="newPassword" type="password" required className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Confirm</Label>
            <Input name="confirmPassword" type="password" required className="mt-1 h-8" />
          </div>
        </div>
        <Button type="submit" size="sm">
          Save password
        </Button>
      </form>

      <h2 className="mb-2 text-sm font-semibold text-navy">
        {user.mfaEnrolled ? "Replace 2FA method" : "Enroll 2FA"}
      </h2>
      <MfaEnrollPanel
        next="/settings/security"
        method={method}
        email={user.mfaEmail ?? user.email}
        phone={user.mfaPhone}
        totpSecret={user.mfaMethod === "totp" ? user.mfaSecret : null}
        stubCode={challenge?.stubCode ?? null}
        stubDestination={challenge?.destination ?? null}
        error={params.error}
      />
    </SettingsShell>
  );
}
