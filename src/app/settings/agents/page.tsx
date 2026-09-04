import Link from "next/link";
import { createAgent } from "@/app/actions/people";
import { forceReenrollMfa, sendMfaResetLink, sendPasswordResetLink } from "@/app/actions/recovery";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/guards";
import { mfaStatusLabel } from "@/lib/auth/mfa";
import { latestUnusedRecoveryByUser, recoveryPath as authRecoveryHref } from "@/lib/auth/store";
import { ACCESS_STATUS_LABEL, type AccessStatus } from "@/lib/people/status";
import { listPeople } from "@/lib/people/store";

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<AccessStatus, string> = {
  active: "bg-fit-green-bg text-fit-green",
  frozen: "bg-fit-yellow-bg text-fit-yellow",
  removed: "bg-fit-red-bg text-fit-red",
};

const ERRORS: Record<string, string> = {
  name: "Name is required.",
  login: "Set a username or email so the agent can sign in.",
  taken: "That username or email is already on the desk.",
  create: "Could not create the agent.",
};

export default async function PeopleAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; user?: string; token?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const { error, notice, user: noticeUserId, token } = params;
  const [people, latest] = await Promise.all([listPeople(), latestUnusedRecoveryByUser()]);
  const active = people.filter((p) => p.status === "active").length;
  const frozen = people.filter((p) => p.status === "frozen").length;
  const noticeUser = people.find((row) => row.id === noticeUserId);
  const stubHref =
    token && notice === "password-reset"
      ? authRecoveryHref("password_reset", token)
      : token && notice === "mfa-reset"
        ? authRecoveryHref("mfa_reset", token)
        : null;

  return (
    <SettingsShell title="People / Agents" current="agents">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Admin manages every desk login. You set the username or email. The agent chooses a
        password on the invite link, then enroll 2-step before the desk opens. Freeze locks
        the desk. Remove is soft — the row stays. Recovery stubs (`/recover/password`,
        `/recover/mfa`) sit on each row — nothing emails. Javy and Maya are MFA enrolled.
        Nora Frost is pending enrollment.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="ff-card px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">On the desk</div>
          <div className="text-xl font-semibold text-navy">{people.length}</div>
        </div>
        <div className="ff-card px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Active</div>
          <div className="text-xl font-semibold text-fit-green">{active}</div>
        </div>
        <div className="ff-card px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Frozen</div>
          <div className="text-xl font-semibold text-fit-yellow">{frozen}</div>
        </div>
      </div>

      {error === "missing" ? (
        <p className="mb-4 rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">That user is gone.</p>
      ) : error && ERRORS[error] ? (
        <p className="mb-4 rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">{ERRORS[error]}</p>
      ) : null}
      {notice === "reenroll" && noticeUser ? (
        <p className="mb-4 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">
          {noticeUser.name} must enroll 2FA again before the desk opens.
        </p>
      ) : null}
      {stubHref && noticeUser ? (
        <div className="mb-4 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">
          <div>
            Stub {notice === "mfa-reset" ? "MFA recovery" : "password reset"} link for{" "}
            {noticeUser.name} — copy and open it. Nothing was emailed.
          </div>
          <a href={stubHref} className="mt-1 block break-all font-mono text-xs text-primary hover:underline">
            {stubHref}
          </a>
        </div>
      ) : null}

      <section className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-navy">Everyone</h2>
          <p className="text-xs text-muted-foreground">Status, privileges, and a producer scorecard per person.</p>
        </div>
        {people.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No desk users yet. Create an agent below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[color:var(--ff-wash)] text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Login</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">2-step</th>
                  <th className="px-4 py-2 font-medium">Office / territory</th>
                  <th className="px-4 py-2 font-medium">Privileges</th>
                  <th className="px-4 py-2 font-medium">Recovery</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {people.map((person) => {
                  const open = latest.get(person.id);
                  return (
                  <tr key={person.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{person.name}</div>
                      <div className="text-xs text-muted-foreground">{person.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {person.username ?? "—"}
                      {person.mustSetPassword ? (
                        <div className="mt-1 text-fit-flag">Waiting on first password</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 capitalize">{person.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[person.status]}`}
                      >
                        {ACCESS_STATUS_LABEL[person.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {mfaStatusLabel(person)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {person.officeLabel || "—"}
                      {person.territoryLabel ? ` · ${person.territoryLabel}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {person.canAccessModules ? "Modules" : "No modules"}
                      {" · "}
                      {person.canSeeAgencyWidgets ? "Agency widgets" : "Own book"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <form action={sendPasswordResetLink}>
                          <input type="hidden" name="userId" value={person.id} />
                          <Button type="submit" size="xs" variant="outline">
                            Password-reset link
                          </Button>
                        </form>
                        <form action={sendMfaResetLink}>
                          <input type="hidden" name="userId" value={person.id} />
                          <Button type="submit" size="xs" variant="outline">
                            MFA-reset link
                          </Button>
                        </form>
                        <form action={forceReenrollMfa}>
                          <input type="hidden" name="userId" value={person.id} />
                          <Button type="submit" size="xs" variant="destructive">
                            Force re-enroll
                          </Button>
                        </form>
                        {open?.stubToken ? (
                          <a
                            href={authRecoveryHref(
                              open.kind === "mfa_reset" ? "mfa_reset" : "password_reset",
                              open.stubToken,
                            )}
                            className="text-[11px] text-primary hover:underline"
                          >
                            Open last stub link
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/settings/agents/${person.id}`} className="text-sm text-primary hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ff-card p-4">
        <h2 className="text-sm font-semibold text-navy">Create agent</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          You set the username or email. They pick the password on the invite stub — nothing emails.
        </p>
        <form action={createAgent} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Name</Label>
            <Input name="name" required className="mt-1 h-8" placeholder="First Last" />
          </div>
          <div>
            <Label className="text-xs">Username</Label>
            <Input name="username" className="mt-1 h-8" placeholder="luis" />
          </div>
          <div>
            <Label className="text-xs">Email login</Label>
            <Input name="email" type="email" className="mt-1 h-8" placeholder="luis@fitfirst.local" />
          </div>
          <div>
            <Label className="text-xs">Office (hook)</Label>
            <Input name="officeLabel" className="mt-1 h-8" placeholder="Palm Bay HQ" />
          </div>
          <div>
            <Label className="text-xs">Territory (hook)</Label>
            <Input name="territoryLabel" className="mt-1 h-8" placeholder="Brevard" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="canAccessModules" defaultChecked />
            Can access modules
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="canSeeAgencyWidgets" />
            Can see agency widgets
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Create agent + invite stub</Button>
          </div>
        </form>
      </section>
    </SettingsShell>
  );
}
