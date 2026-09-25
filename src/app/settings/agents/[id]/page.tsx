import Link from "next/link";
import { notFound } from "next/navigation";
import {
  forceReenrollMfa,
  issueInviteLink,
  issueMfaRecovery,
  issuePasswordReset,
  notifyAgent,
  saveAgentPrivileges,
  setAgentStatus,
} from "@/app/actions/people";
import { sendMfaResetLink, sendPasswordResetLink } from "@/app/actions/recovery";
import { mfaStatusLabel } from "@/lib/auth/mfa";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminPage } from "@/lib/auth/guards";
import { ACCESS_STATUS_LABEL } from "@/lib/people/status";
import { getPerson, listMessagesFor } from "@/lib/people/store";

export const dynamic = "force-dynamic";

const FLASH: Record<string, string> = {
  created: "Agent created. Send the invite stub — they set the password.",
  saved: "Privileges saved.",
  notified: "In-app note posted. It also lands on Alerts.",
  frozen: "Login frozen. They cannot sign in until you unfreeze.",
  active: "Login restored.",
  removed: "Soft-removed. The row stays. They cannot sign in.",
  self: "You cannot freeze or remove your own login.",
  javy: "Javy Rivera stays on the desk. Freeze is allowed; remove is not.",
  message: "Write a short note before Notify.",
  reenroll: "MFA cleared. They must enroll again on next login.",
};

export default async function AgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    saved?: string;
    notified?: string;
    status?: string;
    error?: string;
    invite?: string;
    reset?: string;
    recover?: string;
    reenroll?: string;
  }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const q = await searchParams;
  const person = await getPerson(id);
  if (!person) notFound();
  const messages = await listMessagesFor(person.id);
  const flashKey =
    q.error ??
    q.status ??
    (q.created ? "created" : q.saved ? "saved" : q.notified ? "notified" : q.reenroll ? "reenroll" : "");
  const invite = q.invite ? decodeURIComponent(q.invite) : null;
  const reset = q.reset ? decodeURIComponent(q.reset) : null;
  const recover = q.recover ? decodeURIComponent(q.recover) : null;

  return (
    <SettingsShell title={person.name} current="agents">
      <p className="mb-3 text-sm text-muted-foreground">
        <Link href="/settings/agents" className="text-primary hover:underline">
          People / Agents
        </Link>
        {" · "}
        {person.role === "admin" ? "Admin" : "Agent"} · {ACCESS_STATUS_LABEL[person.status]}
      </p>

      {flashKey && FLASH[flashKey] ? (
        <p className="mb-4 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-fit-green">{FLASH[flashKey]}</p>
      ) : null}

      {invite ? (
        <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm">
          Invite stub (agent sets password):{" "}
          <Link href={invite} className="font-medium text-primary hover:underline">
            {invite}
          </Link>
        </p>
      ) : null}
      {reset ? (
        <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm">
          Reset stub (agent sets a new password):{" "}
          <Link href={reset} className="font-medium text-primary hover:underline">
            {reset}
          </Link>
        </p>
      ) : null}
      {recover ? (
        <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm">
          MFA / account recovery stub:{" "}
          <Link href={recover} className="font-medium text-primary hover:underline">
            {recover}
          </Link>
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <section className="ff-card p-4">
            <h2 className="text-sm font-semibold text-navy">Login</h2>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-helper text-muted-foreground">Username</dt>
                <dd>{person.username ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-helper text-muted-foreground">Email</dt>
                <dd>{person.email}</dd>
              </div>
              <div>
                <dt className="text-helper text-muted-foreground">Password</dt>
                <dd>
                  {person.mustSetPassword
                    ? "Waiting on invite / reset"
                    : person.passwordHash
                      ? "Set by the agent"
                      : "Demo password still works"}
                </dd>
              </div>
              <div>
                <dt className="text-helper text-muted-foreground">Status</dt>
                <dd>{ACCESS_STATUS_LABEL[person.status]}</dd>
              </div>
              <div>
                <dt className="text-helper text-muted-foreground">2-step</dt>
                <dd>
                  {mfaStatusLabel(person)}
                  {person.mfaMethod ? ` · ${person.mfaMethod}` : ""}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {person.status !== "active" ? (
                <form action={setAgentStatus}>
                  <input type="hidden" name="userId" value={person.id} />
                  <input type="hidden" name="status" value="active" />
                  <Button type="submit" size="sm">
                    Unfreeze
                  </Button>
                </form>
              ) : (
                <form action={setAgentStatus}>
                  <input type="hidden" name="userId" value={person.id} />
                  <input type="hidden" name="status" value="frozen" />
                  <Button type="submit" size="sm" variant="outline">
                    Freeze
                  </Button>
                </form>
              )}
              {person.status !== "removed" ? (
                <form action={setAgentStatus}>
                  <input type="hidden" name="userId" value={person.id} />
                  <input type="hidden" name="status" value="removed" />
                  <Button type="submit" size="sm" variant="destructive">
                    Remove
                  </Button>
                </form>
              ) : null}
              <form action={issueInviteLink}>
                <input type="hidden" name="userId" value={person.id} />
                <Button type="submit" size="sm" variant="outline">
                  New invite stub
                </Button>
              </form>
              <form action={issuePasswordReset}>
                <input type="hidden" name="userId" value={person.id} />
                <Button type="submit" size="sm" variant="outline">
                  Reset password stub
                </Button>
              </form>
              <form action={issueMfaRecovery}>
                <input type="hidden" name="userId" value={person.id} />
                <Button type="submit" size="sm" variant="outline">
                  MFA recovery stub
                </Button>
              </form>
              <form action={sendPasswordResetLink}>
                <input type="hidden" name="userId" value={person.id} />
                <Button type="submit" size="sm" variant="outline">
                  /recover password link
                </Button>
              </form>
              <form action={sendMfaResetLink}>
                <input type="hidden" name="userId" value={person.id} />
                <Button type="submit" size="sm" variant="outline">
                  /recover MFA link
                </Button>
              </form>
              <form action={forceReenrollMfa}>
                <input type="hidden" name="userId" value={person.id} />
                <Button type="submit" size="sm" variant="outline">
                  Force re-enroll MFA
                </Button>
              </form>
            </div>
          </section>

          <section className="ff-card p-4">
            <h2 className="text-sm font-semibold text-navy">Privileges</h2>

            <form action={saveAgentPrivileges} className="space-y-3">
              <input type="hidden" name="userId" value={person.id} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="canAccessModules" defaultChecked={person.canAccessModules} />
                Can access modules
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="canSeeAgencyWidgets"
                  defaultChecked={person.canSeeAgencyWidgets}
                />
                Can see agency book
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Office</Label>
                  <Input name="officeLabel" defaultValue={person.officeLabel ?? ""} className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">Territory</Label>
                  <Input
                    name="territoryLabel"
                    defaultValue={person.territoryLabel ?? ""}
                    className="mt-1 h-8"
                  />
                </div>
              </div>
              <Button type="submit" size="sm">
                Save privileges
              </Button>
            </form>
          </section>

          <section className="ff-card p-4">
            <h2 className="text-sm font-semibold text-navy">Notify</h2>

            <form action={notifyAgent} className="space-y-3">
              <input type="hidden" name="userId" value={person.id} />
              <Textarea name="body" required className="min-h-20" placeholder="Short note for this agent." />
              <Button type="submit" size="sm">
                Notify
              </Button>
            </form>
            {messages.length === 0 ? (
              <p className="mt-3 text-helper text-muted-foreground">No notes yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {messages.map((note) => (
                  <li key={note.id} className="rounded-md border border-border px-3 py-2 text-sm">
                    {note.body}
                    <div className="text-helper text-muted-foreground">
                      {note.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          <section className="ff-card p-4">
            <h2 className="text-sm font-semibold text-navy">Performance</h2>

            <Link
              href={`/scorecards/${person.id}`}
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              Open producer scorecard
            </Link>
            <div>
              <Link
                href={`/settings/agents/${person.id}/performance`}
                className="text-helper text-muted-foreground hover:underline"
              >
                Legacy production stub
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </SettingsShell>
  );
}
