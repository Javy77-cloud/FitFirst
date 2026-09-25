import { completeMfaReset } from "@/app/actions/recovery";
import { Button } from "@/components/ui/button";
import { findOpenRecovery } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export default async function RecoverMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const row = token ? await findOpenRecovery(token, "mfa_reset") : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Recovery</div>
          <h1 className="text-2xl font-semibold text-navy">Clear 2FA and re-enroll</h1>

        </div>
        {error === "expired" || (!row && token) ? (
          <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">
            This link is expired or already used. Ask Admin for a new one.
          </p>
        ) : null}
        {row && token ? (
          <form action={completeMfaReset} className="ff-card space-y-3 p-5">
            <input type="hidden" name="token" value={token} />
            <Button type="submit">Clear 2FA</Button>
          </form>
        ) : !token ? (
          <p className="text-sm text-muted-foreground">Missing token. Open the stub link from Admin → Agents.</p>
        ) : null}
      </div>
    </div>
  );
}
