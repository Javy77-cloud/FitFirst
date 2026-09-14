import { SettingsShell } from "@/components/settings/settings-shell";
import { PolicyLabelBuilder } from "@/components/settings/policy-label-builder";
import { PolicyLabelOverrideToggle } from "@/components/settings/policy-label-override-toggle";
import { requireAdminPage } from "@/lib/auth/guards";
import {
  countPolicyLabelOverrides,
  getAgencyPolicyLabelTemplate,
  getAllowPolicyLabelOverride,
} from "@/lib/policy/auto-label-prefs";

export const dynamic = "force-dynamic";

export default async function PolicyLabelsSettingsPage() {
  await requireAdminPage();
  const [template, allowOverride, overrideCount] = await Promise.all([
    getAgencyPolicyLabelTemplate(),
    getAllowPolicyLabelOverride(),
    countPolicyLabelOverrides(),
  ]);

  return (
    <SettingsShell title="Policy labels" current="policy-labels">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Agency-wide auto-label for policy detail titles (and list name when shown). Order the fields,
        pick a separator, preview before save. Labels rebuild live when a field on the policy
        changes. Empty fields are skipped — no double slashes.
      </p>
      <div className="mb-6">
        <PolicyLabelOverrideToggle enabled={allowOverride} overrideCount={overrideCount} />
      </div>
      <PolicyLabelBuilder initial={template} />
    </SettingsShell>
  );
}
