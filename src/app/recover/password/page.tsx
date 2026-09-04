import { completePasswordReset } from "@/app/actions/recovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findOpenRecovery } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export default async function RecoverPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const row = token ? await findOpenRecovery(token, "password_reset") : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Recovery</div>
          <h1 className="text-2xl font-semibold text-navy">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin issued this stub link. It is not an email. After save, sign in with the new
            password.
          </p>
        </div>
        {error === "expired" || (!row && token) ? (
          <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">
            This link is expired or already used. Ask Admin for a new one.
          </p>
        ) : null}
        {error === "password" ? (
          <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">
            Password must be at least 4 characters and match the confirmation.
          </p>
        ) : null}
        {row && token ? (
          <form action={completePasswordReset} className="ff-card space-y-3 p-5">
            <input type="hidden" name="token" value={token} />
            <div>
              <Label className="text-sm">New password</Label>
              <Input name="newPassword" type="password" required className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Confirm</Label>
              <Input name="confirmPassword" type="password" required className="mt-1" />
            </div>
            <Button type="submit">Save password</Button>
          </form>
        ) : !token ? (
          <p className="text-sm text-muted-foreground">Missing token. Open the stub link from Admin → Agents.</p>
        ) : null}
      </div>
    </div>
  );
}
