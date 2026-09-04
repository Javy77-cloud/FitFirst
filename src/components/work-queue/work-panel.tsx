import {
  pingAssignee,
  postWorkNote,
  saveAssignee,
  saveWorkFlag,
  saveWorkStatus,
} from "@/app/actions/work-queue";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FieldSelect } from "@/components/policy/field-select";
import { ADMIN_USER_ID } from "@/lib/fixtures/ids";
import type { DeskUser, PolicyWorkFlag, PolicyWorkNote, ReviewTask } from "@/lib/db/schema";
import { WORK_FLAGS, WORK_STATUSES, workFlagLabel, workStatusLabel } from "@/lib/work-queue/types";
import { WorkFlagPills } from "./flag-pills";

function dueDefault() {
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 3);
  return due.toISOString().slice(0, 10);
}

export function PolicyWorkPanel({
  policyId,
  actorId = ADMIN_USER_ID,
  users,
  assigneeId,
  workStatus,
  flags,
  notes,
  reminders,
}: {
  policyId: string;
  actorId?: string;
  users: DeskUser[];
  assigneeId: string | null;
  workStatus: string | null;
  flags: PolicyWorkFlag[];
  notes: { note: PolicyWorkNote; author: DeskUser | null }[];
  reminders: ReviewTask[];
}) {
  const openFlags = new Set(
    flags.filter((flag) => !flag.clearedAt).map((flag) => flag.flag),
  );

  return (
    <section className="ff-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-navy">Work on this file</h2>
          <p className="mt-1 max-w-2xl text-base text-muted-foreground">
            Assignee and work status are separate from Bound / Active / Lapse.
            Flag the file, note it, and ping in-desk. After issue, use the same
            tools for “carrier needs docs” or “add endorsement,” then file the
            endorsement on the existing Policy tab. No broker email.
          </p>
        </div>
        <WorkFlagPills flags={[...openFlags]} empty="No open flags" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <form action={saveAssignee} className="space-y-2">
          <input type="hidden" name="policyId" value={policyId} />
          <input type="hidden" name="actorId" value={actorId} />
          <Label className="text-xs">Assignee</Label>
          <FieldSelect name="assigneeId" defaultValue={assigneeId ?? actorId} required>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </FieldSelect>
          <Button type="submit" size="sm">
            Assign
          </Button>
        </form>

        <form action={saveWorkStatus} className="space-y-2">
          <input type="hidden" name="policyId" value={policyId} />
          <Label className="text-xs">Work status</Label>
          <FieldSelect name="workStatus" defaultValue={workStatus ?? "ready"} required>
            {WORK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {workStatusLabel(status)}
              </option>
            ))}
          </FieldSelect>
          <Button type="submit" size="sm" variant="secondary">
            Update status
          </Button>
        </form>

        <form action={pingAssignee} className="space-y-2">
          <input type="hidden" name="policyId" value={policyId} />
          <input type="hidden" name="actorId" value={actorId} />
          <Label className="text-xs">In-app ping (Task + pop-up)</Label>
          <Input
            name="message"
            required
            placeholder="Carrier needs X"
            defaultValue="Carrier needs docs"
          />
          <Input name="dueDate" type="date" defaultValue={dueDefault()} />
          <Button type="submit" size="sm" variant="secondary">
            Notify assignee
          </Button>
        </form>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Flags
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {WORK_FLAGS.map((flag) => {
            const on = openFlags.has(flag);
            return (
              <form action={saveWorkFlag} key={flag}>
                <input type="hidden" name="policyId" value={policyId} />
                <input type="hidden" name="actorId" value={actorId} />
                <input type="hidden" name="flag" value={flag} />
                <input type="hidden" name="on" value={on ? "0" : "1"} />
                <Button type="submit" size="xs" variant={on ? "default" : "outline"}>
                  {on ? "On · " : ""}
                  {workFlagLabel(flag)}
                </Button>
              </form>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </div>
          <form action={postWorkNote} className="mt-2 space-y-2">
            <input type="hidden" name="policyId" value={policyId} />
            <input type="hidden" name="actorId" value={actorId} />
            <Textarea name="body" required rows={3} placeholder="Dated note on this work item" />
            <Button type="submit" size="sm">
              Post note
            </Button>
          </form>
          {notes.length === 0 ? (
            <p className="mt-3 text-base text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-md border border-border">
              {notes.map(({ note, author }) => (
                <li key={note.id} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-base text-muted-foreground">
                    <span>{author?.name ?? "Desk"} · {author?.role ?? "admin"}</span>
                    <span>{note.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
                  </div>
                  <p className="mt-1 text-sm">{note.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Open Tasks
          </div>
          {reminders.length === 0 ? (
            <p className="mt-2 text-base text-muted-foreground">
              No in-app Task on this file. Pings stay here — they never email.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {reminders.map((task) => (
                <li key={task.id} className="rounded-md border border-border px-3 py-2">
                  <div className="text-sm font-medium">{task.title}</div>
                  <div className="text-base text-muted-foreground">
                    Due {task.dueDate.toISOString().slice(0, 10)} · {task.kind.replaceAll("_", " ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
