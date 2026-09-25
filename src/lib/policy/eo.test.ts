import { describe, expect, it } from "vitest";
import { classifyCoverageLine } from "@/lib/coverage/gaps";
import { dealProductForCoverageLine } from "@/lib/coverage/renewal-gaps";
import { lineOfBusinessFromZoho, policySubTypesFor } from "@/lib/commissions/zoho-fields";
import { inferPolicyType } from "@/lib/commissions/master-defaults";
import { parseDealProduct, dealProductDef } from "@/lib/deals/deal-products";
import { productChipLabel } from "@/lib/deals/product-chip-label";
import { productLayoutFields } from "@/lib/deals/product-layout";
import {
  quotingFormForProduct,
  resolveDealProduct,
  sheetProductForQuotingForm,
} from "@/lib/deals/deal-line";
import { defaultGlobalLists } from "@/lib/desk/global-lists";
import { policyRecordName } from "@/lib/desk/policy-name";
import { requiredDocSlots } from "@/lib/documents/doc-slot-advance";
import { normalizeWrittenLine } from "@/lib/leads/auto-route";
import { coverageLinesFromProducts } from "@/lib/quote-sheet/commercial-risk-profile";
import { defaultProductForLine } from "@/lib/quote-sheet/products";
import { dealCreateFieldsFromPick } from "@/lib/quoting/forms";
import { titleCaseLabel } from "@/lib/ui/title-case";
import { buildLobOverviewSections, resolveLobOverviewFamily } from "./lob-overview";
import { formsForCategory } from "@/lib/deals/insurance-cascade";
import { quotingFormById } from "@/lib/quoting/forms";
import {
  commercialLineMenuOptions,
  isErrorsOmissionsProduct,
  liabilityDeductible,
  liabilityLimitText,
  liabilityRetroDate,
  matchesCommercialLineChoice,
  policyProductDisplayLabel,
  productMenuTitle,
} from "./eo";

const LIVE_POLICY = {
  policyNumber: "NXTH4RCXPW-00-PL",
  lineOfBusiness: "GL",
  formType: "Errors & Omissions",
  policySubType: "Errors & Omissions",
};

describe("Errors & Omissions product", () => {
  it("recognizes only the E&O aliases and leaves Professional Liability alone", () => {
    expect(isErrorsOmissionsProduct("EO")).toBe(true);
    expect(isErrorsOmissionsProduct("E&O")).toBe(true);
    expect(isErrorsOmissionsProduct("E & O")).toBe(true);
    expect(isErrorsOmissionsProduct("Errors & Omissions")).toBe(true);
    expect(isErrorsOmissionsProduct("Errors and Omissions")).toBe(true);
    expect(isErrorsOmissionsProduct("Professional Liability (E&O)")).toBe(false);
    expect(isErrorsOmissionsProduct("General Liability")).toBe(false);
    expect(isErrorsOmissionsProduct("Workers' Comp")).toBe(false);
    expect(policyProductDisplayLabel("Errors & Omissions")).toBe("E&O");
    expect(policyProductDisplayLabel("E&O")).toBe("E&O");
    expect(productMenuTitle("Errors & Omissions")).toBe("Errors and Omissions");
    expect(productMenuTitle("E&O")).toBe("Errors and Omissions");
    expect(productMenuTitle("General Liability")).toBeUndefined();
    expect(policyProductDisplayLabel("HO3")).toBe("HO3");
    expect(policyProductDisplayLabel("General Liability")).toBe("General Liability");
    expect(policyProductDisplayLabel("Professional Liability (E&O)")).toBe(
      "Professional Liability (E&O)",
    );
    expect(titleCaseLabel("E&O")).toBe("E&O");
  });

  it("stores new picks as GL / Errors & Omissions and keeps GL and WC picks", () => {
    expect(dealCreateFieldsFromPick("E&O")).toEqual({
      quotingForm: "Errors & Omissions",
      policySubType: "Errors & Omissions",
      lineOfBusiness: "GL",
      quotingLine: "general_liability",
    });
    expect(dealCreateFieldsFromPick("EO")).toEqual(dealCreateFieldsFromPick("Errors and Omissions"));
    expect(dealCreateFieldsFromPick("GL")).toEqual({
      quotingForm: "GL",
      policySubType: "General liability",
      lineOfBusiness: "GL",
      quotingLine: "general_liability",
    });
    expect(dealCreateFieldsFromPick("WC")).toMatchObject({
      quotingForm: "WC",
      lineOfBusiness: "WC",
      quotingLine: "workers_comp",
    });
    expect(lineOfBusinessFromZoho("P&C", "Commercial", "Errors & Omissions")).toBe("GL");
    expect(lineOfBusinessFromZoho("P&C", "E&O", "E&O")).toBe("GL");
    expect(lineOfBusinessFromZoho("P&C", "Commercial", "General Liability")).toBe("GL");
    expect(lineOfBusinessFromZoho("P&C", "Commercial", "Workers' Comp")).toBe("GL");
    expect(lineOfBusinessFromZoho("P&C", "Commercial", "Business Owners Policy (BOP)")).toBe("BOP");
    expect(inferPolicyType("P&C", "Errors & Omissions")).toBe("Commercial");
    expect(inferPolicyType("P&C", "General Liability")).toBe("Commercial");
    expect(policySubTypesFor("P&C", "Commercial")).toContain("Errors & Omissions");
    expect(policySubTypesFor("P&C", "Commercial")).toContain("Professional Liability (E&O)");
  });

  it("is its own commercial product on the GL shop line", () => {
    expect(sheetProductForQuotingForm("Errors & Omissions")).toBe("eo");
    expect(sheetProductForQuotingForm("EO")).toBe("eo");
    expect(sheetProductForQuotingForm("E&O")).toBe("eo");
    expect(sheetProductForQuotingForm("GL")).toBe("gl");
    expect(sheetProductForQuotingForm("WC")).toBe("workers_comp");
    expect(resolveDealProduct({ quotingForm: LIVE_POLICY.formType, lineOfBusiness: "GL" })).toBe("eo");
    expect(resolveDealProduct({ quotingForm: "GL", lineOfBusiness: "GL" })).toBe("gl");
    expect(defaultProductForLine("general_liability")).toBe("gl");
    expect(parseDealProduct("Errors & Omissions")).toBe("eo");
    expect(parseDealProduct("GL")).toBe("gl");
    expect(parseDealProduct("Professional Liability (E&O)")).not.toBe("eo");
    expect(dealProductDef("eo")).toMatchObject({
      quotingForm: "Errors & Omissions",
      lob: "GL",
      shopLine: "general_liability",
      commercial: true,
    });
    expect(quotingFormForProduct("gl")).toBe("GL");
    expect(dealProductForCoverageLine("GL")).toBe("gl");
    expect(productChipLabel({ product: "eo" })).toBe("E&O");
    expect(productChipLabel({ product: "gl" })).toBe("GL");
    expect(coverageLinesFromProducts(["eo"])).toEqual(["E&O"]);
    expect(coverageLinesFromProducts(["workers_comp"])).toEqual(["Workers' Comp"]);
    expect(normalizeWrittenLine("Errors & Omissions")).toBe("EO");
    expect(normalizeWrittenLine("General Liability")).toBe("GL");
    expect(normalizeWrittenLine("HO3")).toBe("HO");
    const seed = defaultGlobalLists().find(
      (row) => row.listKey === "policy_sub_type" && row.label === "Errors & Omissions",
    );
    expect(seed).toMatchObject({ slug: "errors-and-omissions", family: "P&C" });
    expect(quotingFormById("EO")?.label).toBe("E&O");
    const commercial = formsForCategory("pc", "commercial");
    const eoForm = commercial.find((row) => row.id === "EO");
    expect(eoForm).toMatchObject({
      label: "E&O",
      title: "Errors and Omissions",
      storedLabel: "Errors & Omissions",
    });
    const menu = commercialLineMenuOptions(["HO", "GL", "WC"], (value) => value);
    expect(menu.map((row) => row.value)).toEqual(["HO", "GL", "EO", "WC"]);
    expect(menu.find((row) => row.value === "EO")).toMatchObject({
      label: "E&O",
      title: "Errors and Omissions",
    });
    expect(matchesCommercialLineChoice("GL", "GL", "Errors & Omissions")).toBe(true);
    expect(matchesCommercialLineChoice("EO", "GL", "Errors & Omissions")).toBe(true);
    expect(matchesCommercialLineChoice("EO", "GL", "General Liability")).toBe(false);
    expect(matchesCommercialLineChoice("WC", "GL", "Errors & Omissions")).toBe(false);
  });

  it("uses liability fields on the policy overview and does not take workers' comp fields", () => {
    expect(
      resolveLobOverviewFamily({
        lineOfBusiness: LIVE_POLICY.lineOfBusiness,
        formType: LIVE_POLICY.formType,
        policySubType: LIVE_POLICY.policySubType,
      }),
    ).toBe("gl");
    expect(resolveLobOverviewFamily({ lineOfBusiness: "GL" })).toBe("gl");
    expect(resolveLobOverviewFamily({ lineOfBusiness: "WC" })).toBe("wc");
    // Workers' Comp stored on line GL keeps the existing GL family. E&O does not retarget it.
    expect(
      resolveLobOverviewFamily({ lineOfBusiness: "GL", policySubType: "Workers' Comp" }),
    ).toBe("gl");
    expect(
      buildLobOverviewSections({
        policyId: "wc-gl",
        lineOfBusiness: "GL",
        policySubType: "Workers' Comp",
      })[0]?.title,
    ).toBe("General liability");
    expect(
      resolveLobOverviewFamily({ lineOfBusiness: "HO3", formType: "Errors & Omissions" }),
    ).toBe("homeowners");

    const limits = {
      eachOccurrence: "1000000",
      deductible: "2500",
      retroactiveDate: "2020-01-01",
    };
    expect(liabilityLimitText(limits)).toBe("1000000");
    expect(liabilityDeductible(limits)).toBe("2500");
    expect(liabilityRetroDate(limits)).toBe("2020-01-01");
    expect(liabilityRetroDate({ eachOccurrence: "1000000" })).toBeNull();

    const eo = buildLobOverviewSections({
      policyId: "eo-1",
      lineOfBusiness: LIVE_POLICY.lineOfBusiness,
      formType: LIVE_POLICY.formType,
      policySubType: LIVE_POLICY.policySubType,
      coverageLimits: limits,
    });
    expect(eo[0]?.title).toBe("E&O");
    expect(eo[0]?.fields.map((field) => field.key)).toEqual(["limits", "deductible", "retroDate"]);
    expect(eo[0]?.fields.some((field) => field.key === "payroll" || field.key === "classCodes")).toBe(
      false,
    );

    const gl = buildLobOverviewSections({
      policyId: "gl-1",
      lineOfBusiness: "GL",
      formType: "GL",
      policySubType: "General Liability",
      coverageLimits: { eachOccurrence: "1000000" },
    });
    expect(gl[0]?.title).toBe("General liability");
    expect(gl[0]?.fields.map((field) => field.key)).toContain("operations");
    expect(gl[0]?.fields.map((field) => field.key)).not.toContain("retroDate");

    const layout = productLayoutFields("eo").map((field) => field.key);
    expect(layout).toEqual(["limits", "deductible"]);
    expect(productLayoutFields("gl").map((field) => field.key)).toContain("class_code");
    expect(productLayoutFields("workers_comp").map((field) => field.key)).toContain("payroll");
    expect(requiredDocSlots({ product: "eo", quotingForm: "Errors & Omissions" })).toEqual(
      requiredDocSlots({ product: "gl" }),
    );
    expect(
      policyRecordName({
        contactName: "Northstar",
        subType: LIVE_POLICY.policySubType,
        formType: LIVE_POLICY.formType,
        lineOfBusiness: "GL",
        carrierName: "Next",
      }),
    ).toContain(" / E&O / ");
    expect(classifyCoverageLine("Errors & Omissions")).toBe("GL");
    expect(classifyCoverageLine("HO3")).toBe("HO");
    expect(classifyCoverageLine("WORKERS_COMP")).toBe("WC");
  });
});
