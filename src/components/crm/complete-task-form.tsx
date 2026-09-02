import { completeTask } from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";

export function CompleteTaskForm({ taskId }: { taskId: string }) {
  return (
    <form action={completeTask}>
      <input type="hidden" name="taskId" value={taskId} />
      <Button type="submit" size="xs" variant="outline">
        Complete
      </Button>
    </form>
  );
}
