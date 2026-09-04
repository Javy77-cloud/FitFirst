import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { listCatalogItems } from "@/lib/integrations/catalog-store";
import type { IntegrationCategory } from "@/lib/integrations/catalog";

export const dynamic = "force-dynamic";

const CHANNELS: {
  id: IntegrationCategory | "email";
  href: string;
  title: string;
  body: string;
  categories: IntegrationCategory[];
}[] = [
  {
    id: "email",
    href: "/settings/email",
    title: "Email",
    body: "Gmail, Outlook, or Yahoo inbox. Templates and signatures stay under Brand / lists.",
    categories: ["email"],
  },
  {
    id: "phone_sms",
    href: "/settings/sms",
    title: "SMS",
    body: "Twilio or RingCentral text. Campaigns still log would_send. Nothing texts a client.",
    categories: ["phone_sms"],
  },
  {
    id: "phone_sms",
    href: "/settings/phone",
    title: "Phone",
    body: "Call log on the desk. Admin marks the agency-paid trunk. No softphone.",
    categories: ["phone_sms"],
  },
  {
    id: "video",
    href: "/settings/video",
    title: "Video",
    body: "Zoom or Google Meet links later. Calendar stays in FitFirst.",
    categories: ["video"],
  },
];

export default async function CommunicationsSettingsPage() {
  const items = await listCatalogItems();

  return (
    <SettingsShell title="Communications">
      <p className="mb-4 text-sm text-muted-foreground">
        Email, SMS, phone, and video. Each channel is bring-your-own — the agency pays the
        vendor. Open Integrations to connect the catalog.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {CHANNELS.map((channel) => {
          const related = items.filter((item) => channel.categories.includes(item.category));
          const connected = related.filter((item) => item.connected).length;
          return (
            <Link
              key={`${channel.title}-${channel.href}`}
              href={channel.href}
              className="ff-card block p-4 hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-navy">{channel.title}</h2>
                <ConnectionBadge connected={connected > 0} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{channel.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {connected} of {related.length} providers connected
              </p>
            </Link>
          );
        })}
      </div>
      <p className="mt-4 text-sm">
        <Link href="/settings/integrations" className="text-primary hover:underline">
          Open the Integrations catalog
        </Link>
      </p>
    </SettingsShell>
  );
}
