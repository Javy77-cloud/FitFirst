import { cn } from "@/lib/utils";
import { mailtoHref, smsHref, telHref } from "@/lib/desk/contact-actions";

export function DealRowComms({
  phone,
  email,
}: {
  dealId: string;
  contactId?: string | null;
  accountId?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const callHref = telHref(phone);
  const textHref = smsHref(phone);
  const mailHref = mailtoHref(email);
  return (
    <div className="flex flex-wrap gap-1">
      <CommsLink label="Call" href={callHref} enabled={Boolean(callHref)} />
      <CommsLink label="SMS" href={textHref} enabled={Boolean(textHref)} />
      <CommsLink label="Email" href={mailHref} enabled={Boolean(mailHref)} />
    </div>
  );
}

function actionClass(enabled: boolean) {
  return cn(
    "rounded border px-1.5 py-0.5 text-[11px]",
    enabled
      ? "border-primary/40 bg-primary/10 font-medium text-primary hover:bg-primary/15"
      : "cursor-not-allowed border-border text-muted-foreground opacity-50",
  );
}

function CommsLink({
  label,
  href,
  enabled,
}: {
  label: string;
  href: string | null;
  enabled: boolean;
}) {
  if (!enabled || !href) {
    return (
      <span className={actionClass(false)} aria-disabled="true">
        {label}
      </span>
    );
  }
  return (
    <a href={href} className={actionClass(true)}>
      {label}
    </a>
  );
}
