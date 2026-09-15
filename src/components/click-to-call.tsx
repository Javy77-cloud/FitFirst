import { buttonVariants } from "@/components/ui/button";
import { telHref } from "@/lib/desk/contact-actions";
import { cn } from "@/lib/utils";

export function ClickToCall({
  name,
  phone,
}: {
  entityType?: string;
  entityId?: string;
  name: string;
  phone?: string | null;
}) {
  const href = telHref(phone);
  if (!href) return null;
  return (
    <a href={href} className={cn(buttonVariants({ size: "xs", variant: "outline" }))}>
      Click-to-call {phone}
      <span className="sr-only"> {name}</span>
    </a>
  );
}
