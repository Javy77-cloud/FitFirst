import { saveOwnProfile } from "@/app/actions/mfa";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSignedInAllowMfaSetup } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await requireSignedInAllowMfaSetup();
  const params = await searchParams;
  const user = session.user;
  if (!user) return null;

  return (
    <SettingsShell title="Profile" current="profile" allowMfaPending>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        This login only. Email stays on the user row so seed logins keep matching. Password and
        2FA live under Security.
      </p>
      {params.saved ? (
        <p className="mb-4 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">Profile saved.</p>
      ) : null}
      {params.error === "name" ? (
        <p className="mb-4 rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">Name is required.</p>
      ) : null}
      <form action={saveOwnProfile} className="ff-card space-y-3 p-4">
        <div>
          <Label className="text-xs">Name</Label>
          <Input name="name" required defaultValue={user.name} className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input value={user.email} readOnly className="mt-1 h-8 bg-secondary" />
          <p className="mt-1 text-helper text-muted-foreground">
            {session.isAdmin ? "Admin · all book" : "Agent · own book"}
          </p>
        </div>
        <div>
          <Label className="text-xs">Meeting address</Label>
          <Input name="meetingAddress" defaultValue={user.meetingAddress ?? ""} className="mt-1 h-8" />
        </div>
        <Button type="submit" size="sm">
          Save profile
        </Button>
      </form>
    </SettingsShell>
  );
}
