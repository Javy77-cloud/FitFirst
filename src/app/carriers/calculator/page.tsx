import { redirect } from "next/navigation";
import { firstParam } from "@/lib/saved-filters";

export const dynamic = "force-dynamic";

export default async function CarrierCalculatorRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  qs.set("tool", "calculator");
  const carrier = firstParam(params.carrier);
  const lob = firstParam(params.lob);
  if (carrier) qs.set("carrier", carrier);
  if (lob) qs.set("lob", lob);
  redirect(`/carriers/compare?${qs.toString()}`);
}
