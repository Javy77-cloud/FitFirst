import { openSocialInquiryAsLead, retrieveVisibleSocialInquiries } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import type { SocialPulseInquiry } from "@/lib/social/pulse";

export function InquiryList({ inquiries }: { inquiries: SocialPulseInquiry[] }) {
  if (inquiries.length === 0) {
    return (
      <div className="ff-card p-4">
        <h3 className="text-sm font-semibold text-navy">Inbound inquiries</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No inbound inquiries yet. Admin connects accounts under Settings → Social / GBP. GBP stays
          locked for agents until Admin allows monitoring.
        </p>
      </div>
    );
  }

  return (
    <section className="ff-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-navy">Inbound inquiries</h3>
          <p className="text-[11px] text-muted-foreground">
            Social ask → Lead. Same path as Stub social lead. No live vendor sync.
          </p>
        </div>
        <form action={retrieveVisibleSocialInquiries}>
          <Button type="submit" size="sm" variant="outline">
            Retrieve visible
          </Button>
        </form>
      </div>
      <ul className="divide-y divide-border">
        {inquiries.map((inquiry) => (
          <li key={inquiry.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium text-navy">
                {inquiry.firstName} {inquiry.lastName}
                <span className="ml-2 text-[11px] font-normal uppercase tracking-wide text-muted-foreground">
                  {inquiry.platformLabel}
                </span>
                {inquiry.routeLabel ? (
                  <span className="ml-2 text-[11px] font-normal normal-case text-muted-foreground">
                    · {inquiry.routeLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{inquiry.excerpt}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {inquiry.city}, {inquiry.state} {inquiry.zip} · {inquiry.phone}
              </p>
            </div>
            <form action={openSocialInquiryAsLead} className="shrink-0">
              <input type="hidden" name="inquiryId" value={inquiry.id} />
              <Button type="submit" size="sm">
                Open as Lead
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
