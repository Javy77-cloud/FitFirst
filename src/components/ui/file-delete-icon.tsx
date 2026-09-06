import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDeleteIcon({
  label = "Delete",
  className,
  type = "submit",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      data-ff-delete-file
      className={cn("ff-file-delete", className)}
      {...props}
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}
