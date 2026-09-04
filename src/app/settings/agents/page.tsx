import { forceReenrollMfa, sendMfaResetLink, sendPasswordResetLink } from "@/app/actions/recovery";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { MFA_METHOD_LABEL, isMfaMethod } from "@/lib/auth/mfa";
import { latestUnusedRecoveryByUser, listUsersForRecovery, recoveryPath } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export default async function AgentsRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; user?: string; token?: string; error?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const [people, latest] = await Promise.all([listUsersForRecovery(), latestUnusedRecoveryByUser()]);
  const noticeUser = people.find((row) => row.id === params.user);
  const stubHref =
    params.token && params.notice === "password-reset"
      ? recoveryPath("password_reset", params.token)
      : params.token && params.notice === "mfa-reset"
        ? recoveryPath("mfa_reset", params.token)
        : null;

  return (
    <SettingsShell title="Agents" current="agents">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Recovery actions only — password-reset link, MFA-reset link, force re-enroll. Full agent
        admin (licenses, books, hire dates) is a parallel track. Links are stubs: they are not
        emailed.
      </p>

      {params.error === "missing" ? (
        <p className="mb-4 rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">That user is gone.</p>
      ) : null}
      {params.notice === "reenroll" && noticeUser ? (
        <p className="mb-4 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">
          {noticeUser.name} must enroll 2FA again before the desk opens.
        </p>
      ) : null}
      {stubHref && noticeUser ? (
        <div className="mb-4 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">
          <div>
            Stub {params.notice === "mfa-reset" ? "MFA recovery" : "password reset"} link for{" "}
            {noticeUser.name} — copy and open it. Nothing was emailed.
          </div>
          <a href={stubHref} className="mt-1 block break-all font-mono text-xs text-primary hover:underline">
            {stubHref}
          </a>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Role</th>
              <th className="px-2 py-2">2FA</th>
              <th className="px-2 py-2">Recovery</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => {
              const open = latest.get(person.id);
              return (
                <tr key={person.id} className="border-b border-border align-top">
                  <td className="px-2 py-3 font-medium text-navy">{person.name}</td>
                  <td className="px-2 py-3 text-muted-foreground">{person.email}</td>
                  <td className="px-2 py-3 capitalize">{person.role}</td>
                  <td className="px-2 py-3">
                    {person.mfaEnrolled
                      ? isMfaMethod(person.mfaMethod)
                        ? MFA_METHOD_LABEL[person.mfaMethod]
                        : "Enrolled"
                      : "Not enrolled"}
                    {person.mfaDemoBypass ? (
                      <div className="text-[11px] text-muted-foreground">Demo bypass</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col items-start gap-1.5">
                      <form action={sendPasswordResetLink}>
                        <input type="hidden" name="userId" value={person.id} />
                        <Button type="submit" size="xs" variant="outline">
                          Send password-reset link
                        </Button>
                      </form>
                      <form action={sendMfaResetLink}>
                        <input type="hidden" name="userId" value={person.id} />
                        <Button type="submit" size="xs" variant="outline">
                          Send MFA-reset link
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
                          href={recoveryPath(open.kind === "mfa_reset" ? "mfa_reset" : "password_reset", open.stubToken)}
                          className="text-[11px] text-primary hover:underline"
                        >
                          Open last stub link
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SettingsShell>
  );
}
