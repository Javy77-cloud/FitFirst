"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { flashAction } from "@/lib/flash-client";
import { persistFlashScroll } from "@/lib/flash-scroll";
import {
  collectNamedFormControls,
  namedFormControlEntriesToFormData,
  type ListFormControl,
  type ListMutationResult,
} from "@/lib/settings/list-editor";

function asFormControl(el: Element): ListFormControl | null {
  if (
    !(el instanceof HTMLInputElement) &&
    !(el instanceof HTMLSelectElement) &&
    !(el instanceof HTMLTextAreaElement)
  ) {
    return null;
  }
  return {
    name: el.name,
    value: el.value,
    disabled: el.disabled,
    type: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
    checked: el instanceof HTMLInputElement ? el.checked : undefined,
  };
}

/** Descendants plus `[form=id]` associates. React 19 action FormData is descendants-only. */
export function readListFormData(form: HTMLFormElement): FormData {
  const nodes = [
    ...form.querySelectorAll("input[name], select[name], textarea[name]"),
    ...(form.id ? [...document.querySelectorAll(`[form="${CSS.escape(form.id)}"]`)] : []),
  ];
  const seen = new Set<Element>();
  const controls: ListFormControl[] = [];
  for (const el of nodes) {
    if (seen.has(el)) continue;
    seen.add(el);
    const control = asFormControl(el);
    if (control) controls.push(control);
  }
  return namedFormControlEntriesToFormData(collectNamedFormControls(controls));
}

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
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      id={id}
      ref={formRef}
      className={className}
      action={async (submitted) => {
        persistFlashScroll({
          pathname,
          anchor: formRef.current?.closest("[id]")?.id ?? formRef.current?.id ?? null,
        });
        const payload = formRef.current ? readListFormData(formRef.current) : submitted;
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
  const pathname = usePathname();
  return async (formData: FormData) => {
    persistFlashScroll({ pathname });
    const result = await action(formData);
    flashAction(result?.message ?? fallback, result?.kind ?? "success");
    router.refresh();
  };
}
