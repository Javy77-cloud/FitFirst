import { deleteTask, updateTask } from "@/app/actions/alerts";
import { CompleteTaskForm } from "@/components/crm/complete-task-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const KINDS = ["task", "call", "sms", "email", "30_day", "60_day", "90_day", "expiration"] as const;

export function TaskRowEditor({
  task,
}: {
  task: {
    id: string;
    title: string;
    kind: string;
    status: string;
    dueDate: string;
  };
}) {
  return (
    <div className="flex flex-wrap items-start gap-1">
      <details className="relative">
        <summary className="cursor-pointer list-none rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-navy hover:bg-muted">
          Edit
        </summary>
        <form
          action={updateTask}
          className="absolute right-0 z-30 mt-1 w-56 space-y-1.5 rounded-md border border-border bg-card p-2 shadow-md"
        >
          <input type="hidden" name="taskId" value={task.id} />
          <Input name="title" defaultValue={task.title} className="h-7 text-xs" />
          <select
            name="kind"
            defaultValue={task.kind}
            className="h-7 w-full rounded-md border border-input bg-card px-1.5 text-xs"
          >
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={task.status}
            className="h-7 w-full rounded-md border border-input bg-card px-1.5 text-xs"
          >
            <option value="open">open</option>
            <option value="done">done</option>
          </select>
          <Input name="dueDate" type="date" defaultValue={task.dueDate} className="h-7 text-xs" />
          <Button type="submit" size="xs">
            Save
          </Button>
        </form>
      </details>
      <form action={deleteTask}>
        <input type="hidden" name="taskId" value={task.id} />
        <Button type="submit" size="xs" variant="destructive">
          Delete
        </Button>
      </form>
      {task.status === "open" ? <CompleteTaskForm taskId={task.id} /> : null}
    </div>
  );
}
