import { Button } from "@/components/ui/button";

export function OauthWall({
  title = "Connect later · needs OAuth",
  provider,
}: {
  title?: string;
  provider?: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-secondary/40 px-4 py-4">
      <div className="text-sm font-semibold text-navy">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">
        {provider ? `${provider} ` : "This connector "}needs an agency-owned OAuth app. FitFirst
        does not run a live token exchange, does not store vendor refresh tokens for a real grant,
        and does not write to live Zoho. Bring-your-own OAuth lands here later.
      </p>
      <Button type="button" size="sm" className="mt-3" disabled>
        Authorize (needs OAuth)
      </Button>
    </div>
  );
}
