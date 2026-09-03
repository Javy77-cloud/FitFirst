import { redirect } from "next/navigation";

export default async function BusinessAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/accounts/${id}`);
}
