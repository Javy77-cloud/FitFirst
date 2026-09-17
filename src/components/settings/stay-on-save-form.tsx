"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { flashAction } from "@/lib/flash-client";
import type { ListMutationResult } from "@/lib/settings/list-editor";

/**
 * Run a list mutation, toast in place, and refresh RSC without scrolling to top.
 * Server actions must return a result — they must not redirect().
 */
export function StayOnSaveForm({
  action,
  flash = "list-saved",
  id,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<ListMutationResult | void>;
  flash?: string;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <form
      id={id}
      className={className}
      action={async (formData) => {
        const result = await action(formData);
        flashAction(result?.message ?? flash, result?.kind ?? "success");
        router.refresh();
      }}
    >
      {children}
    </form>
  );
}

export function useStayAction(
  action: (formData: FormData) => Promise<ListMutationResult | void>,
  fallback = "list-saved",
) {
  const router = useRouter();
  return async (formData: FormData) => {
    const result = await action(formData);
    flashAction(result?.message ?? fallback, result?.kind ?? "success");
    router.refresh();
  };
}
