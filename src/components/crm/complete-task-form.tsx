import { completeTask } from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CompleteTaskForm({
  taskId,
  noticeOffer = false,
}: {
  taskId: string;
  /** Linked notice task — completing can also clear the deal chip + log. */
  noticeOffer?: boolean;
}) {
  return (
    <form action={completeTask} className="flex flex-wrap items-end gap-1.5">
      <input type="hidden" name="taskId" value={taskId} />
      {noticeOffer ? (
        <div className="flex flex-wrap items-end gap-1.5" data-ff-task-notice-offer="">
          <label className="flex items-center gap-1 pb-1 text-[11px] text-muted-foreground">
            <input type="checkbox" name="clearNotice" value="1" data-ff-task-clear-notice="" />
            Clear notice
          </label>
          <label className="text-[11px] text-muted-foreground">
            Notice notes
            <Input
              name="noticeNotes"
              minLength={2}
              placeholder="Required to clear"
              className="mt-0.5 h-7 w-44 text-xs"
              data-ff-notice-complete-notes=""
            />
          </label>
        </div>
      ) : null}
      <Button type="submit" size="xs" variant="outline">
        Complete
      </Button>
    </form>
  );
}
