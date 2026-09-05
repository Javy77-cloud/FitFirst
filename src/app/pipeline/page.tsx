import { redirect } from "next/navigation";
import { dealsHref, parsePipelineView } from "@/lib/wire/pipeline";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Pipeline is Deals. Keep old bookmarks alive. */
export default async function PipelineRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  redirect(
    dealsHref({
      pipeline: first(params.pipeline),
      view: parsePipelineView(first(params.view)),
      stage: first(params.stage),
      lifeSub: first(params.lifeSub),
      healthSub: first(params.healthSub),
      family: first(params.family),
      pcSub: first(params.pcSub),
      attention: first(params.attention),
    }),
  );
}
