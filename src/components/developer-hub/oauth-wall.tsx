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

      <Button type="button" size="sm" className="mt-3" disabled>
        Authorize (needs OAuth)
      </Button>
    </div>
  );
}
