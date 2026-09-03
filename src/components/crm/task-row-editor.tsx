"use client";

import { useState } from "react";
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
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex flex-wrap gap-1">
        <Button type="button" size="xs" variant="outline" onClick={() => setEditing(true)}>
          Edit
        </Button>
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

  return (
    <form action={updateTask} className="min-w-56 space-y-1.5" onSubmit={() => setEditing(false)}>
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
      <div className="flex gap-1">
        <Button type="submit" size="xs">
          Save
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
