"use client";

import { Columns3 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CARRIER_TABLE_COLUMNS,
  type CarrierTableColumnId,
} from "@/lib/carriers/desk";
import { cn } from "@/lib/utils";

export function ColumnPicker({
  visible,
  onChange,
}: {
  visible: Record<CarrierTableColumnId, boolean>;
  onChange: (next: Record<CarrierTableColumnId, boolean>) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Columns3 className="size-3.5" />
        Columns
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>Show on the table</DropdownMenuLabel>
        {CARRIER_TABLE_COLUMNS.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={visible[col.id]}
            onCheckedChange={(checked) =>
              onChange({ ...visible, [col.id]: checked === true })
            }
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
