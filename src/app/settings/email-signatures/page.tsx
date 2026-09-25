import { saveEmailSignature, testSendEmailSignature } from "@/app/actions/brand";
import { EmailSignatureEditor } from "@/components/templates/email-signature-editor";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import { getAgencyBrand, getDefaultSignature, getResolvedDesk } from "@/lib/db/brand-queries";

export const dynamic = "force-dynamic";

export default async function EmailSignaturesPage() {
  await requireAdminPage();
  const [desk, current, brand] = await Promise.all([
    getResolvedDesk(),
    getDefaultSignature(),
    getAgencyBrand(),
  ]);

  return (
    <SettingsShell title="Email signatures" current="signatures">
      {!desk.isAdmin ? null : (
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Agency-owned close. Templates merge {`{{signature}}`} — also appended when a template
          omits it. Personal closes on{" "}
          <a href="/me?section=signature" className="text-primary hover:underline">
            Me → Email signature
          </a>{" "}
          override this without forking the library. Approval drafts still live in{" "}
          <a href="/automations/signatures" className="text-primary hover:underline">
            Automations → Signatures
          </a>
          .
        </p>
      )}
      <EmailSignatureEditor
        id={current?.id}
        name={current?.name ?? "Agency default"}
        bodyEn={current?.bodyEn ?? ""}
        bodyEs={current?.bodyEs ?? ""}
        isExampleCopy={current?.isExampleCopy ?? true}
        agencyName={brand?.agencyName}
        disabled={!desk.isAdmin}
        saveAction={saveEmailSignature}
        testSendAction={desk.isAdmin ? testSendEmailSignature : undefined}
      />
    </SettingsShell>
  );
}
