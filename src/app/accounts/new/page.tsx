import Link from "next/link";
import { createBusiness } from "@/app/actions/businesses-ops";
import { AppShell } from "@/components/app-shell";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { Button } from "@/components/ui/button";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { loadModuleLayoutBundle } from "@/lib/custom-fields/store";
import { allLayoutFieldKeys } from "@/lib/custom-fields/types";

export const dynamic = "force-dynamic";

export default async function NewBusinessPage() {
  const bundle = await loadModuleLayoutBundle("businesses").catch(() => null);
  const layout = bundle?.layout ?? defaultLayoutForModule("businesses");
  const fields = bundle?.fields ?? [];
  const values = Object.fromEntries(allLayoutFieldKeys(layout).map((key) => [key, ""]));

  return (
    <AppShell title="Add Account">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

        <EditLayoutLink module="businesses" />
      </div>

      <form action={createBusiness} className="w-full space-y-3" data-ff="new-business-layout">
        <input type="hidden" name="state" value="FL" />
        <RecordLayoutFields module="businesses" layout={layout} fields={fields} values={values} />
        <div className="flex items-center justify-end gap-3 pt-1" data-ff-business-actions="">
          <Link href="/accounts" className="text-sm text-primary hover:underline">
            Back To Accounts
          </Link>
          <Button type="submit" data-ff-save-business="">
            Save Account
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
