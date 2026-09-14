"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function TasksGroupBySelect({ value }: { value: string }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <div className="flex items-center gap-2" data-ff-tasks-group-by="">
      <label htmlFor="ff-tasks-group-by" className="text-xs font-medium text-navy">
        Group by
      </label>
      <select
        id="ff-tasks-group-by"
        className="h-8 rounded-md border border-input bg-card px-2 text-sm"
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          next.set("groupBy", event.target.value);
          router.push(`/tasks?${next.toString()}`);
        }}
      >
        <option value="policy">By linked record</option>
        <option value="task_type">By task type</option>
        <option value="due">By due date</option>
      </select>
    </div>
  );
}
