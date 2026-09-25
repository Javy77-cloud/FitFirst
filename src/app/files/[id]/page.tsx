import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DocFileActions } from "@/components/deal/doc-file-actions";
import { PrintOnLoad } from "@/components/files/print-on-load";
import { buttonVariants } from "@/components/ui/button";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { contacts, deals } from "@/lib/db/schema";
import { getDeskDocument, loadDocumentBytes } from "@/lib/files/serve-document";
import { fileViewHref } from "@/lib/files/urls";
import { eq } from "drizzle-orm";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FilePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const session = await currentDeskSession();
  if (!session.signedIn) redirect("/login");
  const { id } = await params;
  const { print } = await searchParams;
  const doc = await getDeskDocument(id);
  if (!doc) notFound();

  const [deal] = doc.dealId ? await db.select().from(deals).where(eq(deals.id, doc.dealId)) : [];
  const [contact] = doc.contactId
    ? await db.select().from(contacts).where(eq(contacts.id, doc.contactId))
    : deal?.contactId
      ? await db.select().from(contacts).where(eq(contacts.id, deal.contactId))
      : [];

  const file = await loadDocumentBytes(doc);
  const mime = file?.mimeType ?? doc.mimeType ?? "";
  const href = fileViewHref(doc.id);
  const isPdf = mime.includes("pdf");
  const isImage = mime.startsWith("image/");
  const backHref = doc.dealId ? `/deals/${doc.dealId}?tab=documents` : "/documents";

  return (
    <AppShell
      title={doc.filename}
      eyebrow="Document preview"
      actions={
        <Link href={backHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ff-no-print")}>
          Back to deal
        </Link>
      }
    >
      <PrintOnLoad enabled={print === "1"} />
      <div className="ff-no-print mb-4 flex flex-wrap items-center justify-between gap-3">

        <DocFileActions
          documentId={doc.id}
          filename={doc.filename}
          dealId={doc.dealId}
          contactId={contact?.id ?? doc.contactId}
          email={contact?.email}
          phone={contact?.phone}
        />
      </div>
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        {file == null ? (
          <div className="space-y-2 px-6 py-16 text-center" data-ff-file-missing="">
            <p className="text-sm font-semibold text-navy">{doc.filename} is not in storage.</p>

            <Link href={backHref} className={cn(buttonVariants({ size: "sm" }), "mt-2 inline-flex")}>
              Back to Documents
            </Link>
          </div>
        ) : isPdf ? (
          <iframe title={doc.filename} src={href} className="h-[78vh] w-full bg-white" />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={href} alt={doc.filename} className="mx-auto max-h-[78vh] w-auto max-w-full" />
        ) : (
          <iframe title={doc.filename} src={href} className="h-[78vh] w-full bg-white" />
        )}
      </section>
    </AppShell>
  );
}
