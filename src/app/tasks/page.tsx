import { AppShell } from "@/components/app-shell";
import { listReviewTasks } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await listReviewTasks();
  return (
    <AppShell title="Tasks">
      <p className="mb-3 text-sm text-muted-foreground">
        Desk 30/60/90 and review tasks. Activity timeline on Contact and Policy still owns
        task/call logs assigned to those records.
      </p>
      <section className="ff-card overflow-hidden">
        {tasks.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No open review tasks.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.dueDate.toISOString().slice(0, 10)}</td>
                  <td>{task.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
