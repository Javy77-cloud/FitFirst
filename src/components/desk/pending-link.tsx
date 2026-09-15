"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function LinkPendingHint() {
  const { pending } = useLinkStatus();
  return <span hidden data-ff-link-pending={pending ? "1" : "0"} />;
}

export function PendingLink({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link className={cn("ff-pending-link", className)} {...props}>
      {children}
      <LinkPendingHint />
    </Link>
  );
}
