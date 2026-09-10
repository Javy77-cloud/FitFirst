"use client";

import type { MouseEvent, ReactNode } from "react";
import { confirmClearAllColors } from "@/lib/desk/confirm-hard-delete";

/** One confirm, then clear every value’s color to None on this list. */
export function ClearAllColorsForm({
  action,
  subject,
  className,
  children,
}: {
  action: (formData: FormData) => unknown;
  subject: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      data-ff-clear-all-colors=""
      onClickCapture={(event: MouseEvent<HTMLFormElement>) => {
        const node = event.target;
        if (!(node instanceof Element)) return;
        const submitter = node.closest("button, input[type='submit']");
        if (!submitter) return;
        if (submitter instanceof HTMLButtonElement && submitter.type !== "submit") return;

        event.preventDefault();
        event.stopPropagation();

        if (!confirmClearAllColors(subject)) return;

        event.currentTarget.requestSubmit(
          submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
            ? submitter
            : undefined,
        );
      }}
    >
      {children}
    </form>
  );
}
