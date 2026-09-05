import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InHouseOnly({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section className="ff-card max-w-2xl p-5">
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <p className="mt-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
        FitFirst does not buy Twilio, SendGrid, Mailchimp, or Constant Contact. Internal pings stay
        in-app / pop-up. Nothing emails Javy.
      </p>
      <Link
        href="/automations/playbooks"
        className={cn(buttonVariants({ size: "sm" }), "mt-4 inline-flex")}
      >
        Open playbooks
      </Link>
    </section>
  );
}
