import Link from "next/link";
import { logoutDesk } from "@/app/actions/auth";
import { MfaEnrollPanel } from "@/components/auth/mfa-enroll-panel";
import { requireSignedInAllowMfaSetup } from "@/lib/auth/guards";
import { isMfaMethod } from "@/lib/auth/mfa";
import { latestOpenChallenge } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export default async function EnrollMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string; error?: string }>;
}) {
  const session = await requireSignedInAllowMfaSetup();
  const params = await searchParams;
  const user = session.user;
  if (!user) return null;
  if (user.mfaEnrolled) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-semibold text-navy">2FA already enrolled</h1>

        <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to the desk
        </Link>
      </div>
    );
  }
  const challenge = await latestOpenChallenge(user.id, "enroll");
  const method = isMfaMethod(params.method) ? params.method : isMfaMethod(user.mfaMethod) ? user.mfaMethod : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">FitFirst desk</div>
        <h1 className="text-2xl font-semibold text-navy">Enroll 2FA before the desk opens</h1>

        <p className="mt-1 text-sm text-navy">Signed in as {user.name} · {user.email}</p>
      </div>
      <MfaEnrollPanel
        next="/enroll-mfa"
        method={method}
        email={user.mfaEmail ?? user.email}
        phone={user.mfaPhone}
        totpSecret={user.mfaMethod === "totp" ? user.mfaSecret : null}
        stubCode={challenge?.stubCode ?? null}
        stubDestination={challenge?.destination ?? null}
        error={params.error}
      />
      <form action={logoutDesk}>
        <button type="submit" className="text-sm text-primary hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
