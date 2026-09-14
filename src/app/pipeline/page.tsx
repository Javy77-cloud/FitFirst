import { redirect } from "next/navigation";
import { dealsHref } from "@/lib/wire/pipeline";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Pipeline is Deals. Keep old bookmarks alive. Renewals book lands on /renewals. */
export default async function PipelineRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (first(params.book) === "renewals" || first(params.mode) === "renewals") {
    redirect("/renewals");
  }
  // Pass view only when present so cookie default still applies on bare /pipeline.
  redirect(
    dealsHref({
      pipeline: first(params.pipeline),
      view: first(params.view),
      stage: first(params.stage),
      lifeSub: first(params.lifeSub),
      healthSub: first(params.healthSub),
      family: first(params.family),
      pcSub: first(params.pcSub),
      attention: first(params.attention),
    }),
  );
}
