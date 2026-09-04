import { completeInvitePassword } from "@/app/actions/people";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findPersonByToken } from "@/lib/people/store";
import { isTokenLive } from "@/lib/people/tokens";

export const dynamic = "force-dynamic";

export default async function InvitePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const person = token ? await findPersonByToken("invite", token) : null;
  const live = person ? isTokenLive(person.inviteToken, person.inviteExpiresAt) : false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="ff-card w-full max-w-md space-y-4 p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">FitFirst desk</div>
        <h1 className="text-xl font-semibold text-navy">Choose your password</h1>
        {!token || !live || !person ? (
          <p className="text-sm text-fit-red">
            This invite link is missing or expired. Ask an Admin to send a new stub from
            Settings → People / Agents.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {person.name} · {person.email}. Admin created this login. You set the password.
            </p>
            {error === "password" ? (
              <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">
                Password must be at least 4 characters and match the confirmation.
              </p>
            ) : null}
            <form action={completeInvitePassword} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <div>
                <Label className="text-xs">New password</Label>
                <Input name="password" type="password" required minLength={4} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Confirm</Label>
                <Input name="confirm" type="password" required minLength={4} className="mt-1" />
              </div>
              <Button type="submit">Save password and set up 2-step</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
