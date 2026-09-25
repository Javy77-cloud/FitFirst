import { completeResetPassword } from "@/app/actions/people";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findPersonByToken } from "@/lib/people/store";
import { isTokenLive } from "@/lib/people/tokens";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const person = token ? await findPersonByToken("reset", token) : null;
  const live = person ? isTokenLive(person.resetToken, person.resetExpiresAt) : false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="ff-card w-full max-w-md space-y-4 p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">FitFirst desk</div>
        <h1 className="text-xl font-semibold text-navy">Set a new password</h1>
        {!token || !live || !person ? (
          <p className="text-sm text-fit-red">
            This reset link is missing or expired. Ask an Admin to push a new stub from
            Settings → People / Agents.
          </p>
        ) : (
          <>

            {error === "password" ? (
              <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">
                Password must be at least 4 characters and match the confirmation.
              </p>
            ) : null}
            <form action={completeResetPassword} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <div>
                <Label className="text-xs">New password</Label>
                <Input name="password" type="password" required minLength={4} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Confirm</Label>
                <Input name="confirm" type="password" required minLength={4} className="mt-1" />
              </div>
              <Button type="submit">Save new password</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
