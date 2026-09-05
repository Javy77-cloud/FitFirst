"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CREATE_MENU } from "@/lib/desk/create-menu";

export function HomeNewMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" className="gap-1 bg-primary text-primary-foreground hover:bg-primary/85" />
        }
      >
        <Plus className="size-3.5" data-icon="inline-start" />
        New
        <ChevronDown className="size-3.5 opacity-80" data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-56 rounded-lg border border-border bg-[var(--ff-card)] p-1.5 shadow-md"
      >
        {CREATE_MENU.map((group, index) => (
          <DropdownMenuGroup key={group.id}>
            {index > 0 ? <DropdownMenuSeparator className="bg-[var(--ff-border)]" /> : null}
            <DropdownMenuLabel className="px-2 pt-1.5 pb-0.5 text-caption font-semibold uppercase tracking-wide text-[var(--ff-terracotta)]">
              {group.label}
            </DropdownMenuLabel>
            {group.items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                render={<Link href={item.href} />}
                className="rounded-md px-2 py-1.5 text-sm text-navy focus:bg-[var(--ff-check-bg)] focus:text-navy"
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
