"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { flashAction } from "@/lib/flash-client";
import type { ListMutationResult } from "@/lib/settings/list-editor";

/**
 * Run a list mutation, toast in place, and refresh RSC without scrolling to top.
 * Server actions must return a result — they must not redirect().
 *
 * React 19's action FormData is descendants-only. List editors keep option
 * fields outside the <form> and associate them with `form={id}`, so we rebuild
 * from the DOM form (that includes those controls) before calling the action.
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
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      id={id}
      ref={formRef}
      className={className}
      action={async (submitted) => {
        const payload = formRef.current ? new FormData(formRef.current) : submitted;
        const result = await action(payload);
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
