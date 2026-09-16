import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionToast } from "@/components/desk/action-toast";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("site-wide action confirmation toast", () => {
  it("renders confirmation copy at the shared top-center host", () => {
    const html = renderToStaticMarkup(createElement(ActionToast, { message: "Deal details saved" }));
    expect(html).toContain("Deal details saved");
    expect(html).toContain('data-testid="action-toast"');
    expect(html).toContain('data-ff-action-toast=""');
    expect(html).toContain("bg-navy");

    const host = source("src/components/desk/action-toast.tsx");
    expect(host).toMatch(/data-ff-action-toast-host/);
    expect(host).toMatch(/fixed inset-x-0 top-4/);
    expect(host).toMatch(/justify-center/);
    expect(host).toMatch(/FLASH_DISMISS_MS/);
    expect(host).toMatch(/aria-label="Dismiss"/);
    expect(host).toMatch(/searchParams\.get\(FLASH_PARAM\)/);
    expect(host).toMatch(/FLASH_EVENT/);
    expect(host).toMatch(/persistFlash/);
    expect(host).toMatch(/readPersistedFlash/);
    expect(host).toMatch(/requestAnimationFrame/);
    expect(host).toMatch(/router\.replace/);
    expect(host).toMatch(/router\.refresh/);

    const layout = source("src/app/layout.tsx");
    expect(layout).toMatch(/ActionToastHost/);
    expect(layout).toMatch(/<ActionToastHost \/>/);
  });

  it("saves Deal Details, field-builder layout, and the master sheet through flashAction", () => {
    const values = source("src/app/actions/custom-fields.ts");
    expect(values).toMatch(/dealDetailsSavedHref\(dealId/);
    expect(values).toMatch(/"deal-details-saved"/);
    expect(values).toMatch(/flashAction\("\/settings\/field-builder", "layout-saved"\)/);
    expect(values).toMatch(/line: form\?\.shopLine \|\| str\(formData, "line"\)/);
    expect(values).toMatch(/product: product \|\| str\(formData, "product"\)/);
    expect(values).toMatch(/throw new Error\("Deal details could not be saved\."\)/);
    const layoutAt = values.indexOf("await saveLayoutForEveryLine(layout)");
    const flashAt = values.indexOf('flashAction("/settings/field-builder", "layout-saved")');
    expect(layoutAt).toBeGreaterThan(-1);
    expect(flashAt).toBeGreaterThan(layoutAt);

    const sheet = source("src/app/actions/quote-sheet.ts");
    expect(sheet).toMatch(/flashAction\(dest, "sheet-saved"\)/);
    expect(sheet).toMatch(/flashAction\(returnTo \|\| `\/deals\/\$\{dealId\}\?tab=documents/);

    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    expect(panel).toMatch(/action=\{saveDealFieldValues\}/);
    expect(panel).toMatch(/Save deal details/);

    const master = source("src/components/deal/master-sheet-compare.tsx");
    expect(master).toMatch(/action=\{saveQuoteSheet\}/);
    expect(master).toMatch(/Save sheet/);
    expect(master).toMatch(/name="returnTo"/);
  });

  it("wires the same helper on other silent deal/desk mutations", () => {
    expect(source("src/app/actions/record-tags.ts")).toMatch(
      /flashAction\(pathsFor\(module\)\.detail\(recordId\), "tags-saved"\)/,
    );
    expect(source("src/app/actions/documents.ts")).toMatch(
      /redirect\(withFlash\(returnTo, "document-deleted"\)\)/,
    );
    expect(source("src/app/actions/document-versions.ts")).toMatch(
      /flashAction\(dest, "document-replaced"\)/,
    );
    expect(source("src/app/actions/deal-desk.ts")).toMatch(
      /flashAction\(`\/deals\/\$\{dealId\}\?tab=markets`, "market-added"\)/,
    );
    expect(source("src/app/actions/record-edit.ts")).toMatch(
      /flashAction\(`\/deals\/\$\{id\}`, "deal-updated"\)/,
    );
    expect(source("src/app/actions/quotes.ts")).toMatch(
      /flashAction\(quotesRequestedHref\(dealId, extras\), "quotes-requested"\)/,
    );
    expect(source("src/app/actions/lifecycle.ts")).toMatch(
      /withFlash\(\s*`\/deals\/\$\{dealId\}\?tab=documents&line=\$\{line\}&notice=filled`,\s*toastForFillCounts\(/,
    );
    expect(source("src/lib/flash-action.ts")).toMatch(/export function flashAction/);
    expect(source("src/lib/flash-action.ts")).toMatch(/export function flashStay/);
    expect(source("src/lib/flash-client.ts")).toMatch(/export function flashAction/);
  });

  it("wires flashAction on desk Save paths after a successful persist", () => {
    expect(source("src/app/actions/field-picklists.ts")).toMatch(
      /flashAction\("\/settings\/picklists", "list-saved"\)/,
    );
    expect(source("src/app/actions/policy-record.ts")).toMatch(/flashAction\(`\/policies\/\$\{id\}`, "policy-saved"\)/);
    expect(source("src/app/actions/agency.ts")).toMatch(/flashAction\("\/settings", "brand-saved"\)/);
    expect(source("src/app/actions/agency.ts")).toMatch(/flashAction\("\/settings", "template-saved"\)/);
    expect(source("src/app/actions/brand.ts")).toMatch(/flashAction\("\/settings\/agency", "brand-saved"\)/);
    expect(source("src/app/actions/brand.ts")).toMatch(/flashAction\("\/settings\/my-desk", "desk-saved"\)/);
    expect(source("src/app/actions/home-dashboard.ts")).toMatch(/flashAction\("\/", "widgets-saved"\)/);
    expect(source("src/app/actions/home-dashboard.ts")).toMatch(/flashAction\("\/", "home-layout-saved"\)/);
    expect(source("src/app/actions/nav-layout.ts")).toMatch(/flashAction\("\/me", "settings-saved"\)/);
    expect(source("src/app/actions/line-settings.ts")).toMatch(
      /flashAction\("\/settings\/lines", "line-settings-saved"\)/,
    );
    expect(source("src/app/actions/offices.ts")).toMatch(/flashAction\("\/settings\/offices", "office-saved"\)/);
    expect(source("src/app/actions/offices.ts")).toMatch(
      /flashAction\("\/settings\/territories", "territory-saved"\)/,
    );
    expect(source("src/app/actions/lead-routing.ts")).toMatch(/flashAction\("\/settings\/routing", "rule-saved"\)/);
    expect(source("src/app/actions/telephony.ts")).toMatch(/flashAction\("\/settings\/phone", "phone-saved"\)/);
    expect(source("src/app/actions/esign-settings.ts")).toMatch(/flashAction\("\/settings\/esign", "esign-saved"\)/);
    expect(source("src/app/actions/people.ts")).toMatch(
      /flashAction\(`\/settings\/agents\/\$\{id\}`, "privileges-saved"\)/,
    );
    expect(source("src/app/actions/mfa.ts")).toMatch(/flashAction\("\/settings\/profile", "profile-saved"\)/);
    expect(source("src/app/actions/mfa.ts")).toMatch(/flashAction\("\/settings\/security", "password-saved"\)/);
    expect(source("src/app/actions/meetings.ts")).toMatch(
      /flashAction\("\/settings\/communications", "communications-saved"\)/,
    );
    expect(source("src/app/actions/activities-desk.ts")).toMatch(/"changes-saved"/);
    expect(source("src/app/actions/alerts.ts")).toMatch(/flashAction\(`\/tasks\/\$\{id\}`, "changes-saved"\)/);
    expect(source("src/app/actions/desk.ts")).toMatch(/flashBack\("columns-saved"\)/);
    expect(source("src/app/actions/pipeline-admin.ts")).toMatch(
      /flashAction\(`\/carriers\/\$\{id\}`, "carrier-saved"\)/,
    );
    expect(source("src/lib/flash.ts")).toMatch(/"layout-saved": "Deal layout saved"/);
    expect(source("src/lib/flash.ts")).toMatch(/"settings-saved": "Settings saved"/);
    expect(source("src/app/actions/header-quick.ts")).toMatch(
      /flashAction\("\/calendar", "meeting-saved"\)/,
    );
    expect(source("src/app/actions/alerts.ts")).toMatch(
      /flashAction\(`\/tasks\/\$\{row\.id\}`, "task-saved"\)/,
    );
    expect(source("src/app/actions/phone.ts")).toMatch(/flashAction\(returnTo, "outcome-saved"\)/);
    expect(source("src/app/api/desk/finish-call/route.ts")).toMatch(
      /withFlash\(result\.returnTo, "outcome-saved"\)/,
    );
    expect(source("src/app/actions/people.ts")).toMatch(/flashAction\("\/enroll-mfa", "password-saved"\)/);
    expect(source("src/app/actions/recovery.ts")).toMatch(/flashAction\("\/login", "password-saved"\)/);
    expect(source("src/app/actions/learning-consent.ts")).toMatch(
      /flashAction\("\/onboarding\/purchase", "consent-saved"\)/,
    );
    expect(source("src/components/crm/meeting-button.tsx")).toMatch(/flashAction\("meeting-saved"\)/);
    expect(source("src/components/calendar/company-meeting-form.tsx")).toMatch(
      /flashAction\("meeting-saved"\)/,
    );
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/action=\{saveDealFieldLayout\}/);
    expect(builder).toMatch(/data-ff-save-layout/);
  });

  it("persists flash in sessionStorage so remount after replace still shows the toast", () => {
    const host = source("src/components/desk/action-toast.tsx");
    expect(host).toMatch(/persistFlash\(\{ message, kind \}\)/);
    expect(host).toMatch(/readPersistedFlash\(\)/);
    expect(host).toMatch(/clearPersistedFlash/);
    // Persist and paint before stripping ?flash= — remount can restore from storage.
    const persistAt = host.indexOf("showToast(message, kind)");
    const rafAt = host.indexOf("requestAnimationFrame");
    const replaceAt = host.lastIndexOf("router.replace");
    const refreshAt = host.lastIndexOf("router.refresh");
    expect(persistAt).toBeGreaterThan(-1);
    expect(rafAt).toBeGreaterThan(persistAt);
    expect(replaceAt).toBeGreaterThan(rafAt);
    expect(refreshAt).toBeGreaterThan(replaceAt);

    const flash = source("src/lib/flash.ts");
    expect(flash).toMatch(/FLASH_STORAGE_KEY = "ff-action-toast"/);
    expect(flash).toMatch(/sessionStorage/);
    expect(flash).toMatch(/export function persistFlash/);
    expect(flash).toMatch(/export function readPersistedFlash/);
    expect(flash).toMatch(/tab: "documents"/);
    expect(flash).toMatch(/Deal details saved/);
  });
});
