"use client";

import { useTransition } from "react";
import { updateGlobalListItemColor } from "@/app/actions/global-lists";
import { StatusColorSelect } from "@/components/desk/status-color-select";

/** Picking a color saves immediately — no separate Save click. */
export function GlobalListColorForm({
  id,
  label,
  color,
}: {
  id: string;
  label: string;
  color: string | null;
}) {
  const [pending, start] = useTransition();
  return (
    <form
      className="flex items-center gap-1"
      onChange={(event) => {
        const form = event.currentTarget;
        start(() => {
          void updateGlobalListItemColor(new FormData(form));
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      <StatusColorSelect
        defaultValue={color}
        aria-label={`Color for ${label}`}
        disabled={pending}
      />
    </form>
  );
}
