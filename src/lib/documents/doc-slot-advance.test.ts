import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DocSlotTabList } from "@/components/deal/doc-slot-tab-list";
import {
  canonicalQuotingForm,
  docSaveStayError,
  filledDocTypesForLine,
  initialDocSlot,
  planDocSaveAdvance,
  requiredDocSlots,
} from "./doc-slot-advance";

const rosaHo3 = { product: "homeowners", quotingForm: "HO3", shopLine: "home" };
const catherineMmho = { product: "homeowners", quotingForm: "MMHO", shopLine: "home" };

describe("required document slots", () => {
  it("gives Rosa Castellanos HO3 four required document slots", () => {
    const slots = requiredDocSlots(rosaHo3);
    expect(slots.map((slot) => slot.docType)).toEqual(["dec", "wind_mit", "four_point", "photo"]);
    expect(slots.every((slot) => slot.required)).toBe(true);
    expect(slots.map((slot) => slot.label)).toEqual([
      "Declaration page",
      "Wind mitigation",
      "4-point",
      "Photos",
    ]);
  });

  it("treats Catherine Garcia MMHO as manufactured home with the same four slots", () => {
    expect(canonicalQuotingForm("MMHO")).toBe("MHO");
    expect(canonicalQuotingForm("Manufactured Home")).toBe("MHO");
    const slots = requiredDocSlots(catherineMmho);
    expect(slots.map((slot) => slot.docType)).toEqual(
      requiredDocSlots({ product: "homeowners", quotingForm: "MHO", shopLine: "home" }).map(
        (slot) => slot.docType,
      ),
    );
    expect(requiredDocSlots({ product: "mmho", quotingForm: "MMHO" }).map((slot) => slot.docType)).toEqual([
      "dec",
      "wind_mit",
      "four_point",
      "photo",
    ]);
  });

  it("gives every other product its own required sequence", () => {
    expect(requiredDocSlots({ product: "auto", quotingForm: "PA", shopLine: "auto" }).map((s) => s.docType)).toEqual([
      "dec",
      "photo",
    ]);
    expect(requiredDocSlots({ product: "flood", quotingForm: "FLOOD" }).map((s) => s.docType)).toEqual([
      "dec",
      "inspection",
      "photo",
    ]);
    expect(requiredDocSlots({ product: "renters", quotingForm: "HO4" }).map((s) => s.docType)).toEqual([
      "dec",
      "photo",
    ]);
    expect(requiredDocSlots({ product: "life_term", shopLine: "life" }).map((s) => s.docType)).toEqual(["other"]);
    expect(requiredDocSlots({ product: "gl", quotingForm: "GL" }).map((s) => s.label)).toEqual([
      "Declaration page",
      "Photos",
      "Reports",
    ]);
    expect(requiredDocSlots({ product: "boat", shopLine: "rec_rv" }).map((s) => s.docType)).toEqual([
      "dec",
      "photo",
    ]);
  });
});

describe("advance after a document save", () => {
  const slots = requiredDocSlots(rosaHo3);
  const base = {
    slots,
    dealId: "deal-rosa",
    line: "home",
    product: "homeowners",
    marketsDone: false,
    quotesDone: false,
  };

  it("moves Catherine and Rosa to the next empty required slot after a successful save", () => {
    const plan = planDocSaveAdvance({
      ...base,
      ok: true,
      savedDocTypes: ["dec"],
      filledDocTypes: [],
      slotLabel: "Declaration page",
    });
    expect(plan).toMatchObject({
      action: "slot",
      docType: "wind_mit",
      label: "Wind mitigation",
      href: "/deals/deal-rosa?tab=documents&line=home&product=homeowners&docSlot=wind_mit",
    });

    const catherine = planDocSaveAdvance({
      ...base,
      slots: requiredDocSlots(catherineMmho),
      dealId: "deal-catherine",
      ok: true,
      savedDocTypes: ["wind_mit"],
      filledDocTypes: ["dec"],
    });
    expect(catherine).toMatchObject({ action: "slot", docType: "four_point" });
  });

  it("skips a slot that already has a file", () => {
    const plan = planDocSaveAdvance({
      ...base,
      ok: true,
      savedDocTypes: ["dec"],
      filledDocTypes: ["wind_mit"],
    });
    expect(plan).toMatchObject({ action: "slot", docType: "four_point" });
  });

  it("stays on the current tab with a specific error when the save fails", () => {
    const plan = planDocSaveAdvance({
      ...base,
      ok: false,
      reason: "documents-save-failed",
      slotLabel: "Wind mitigation",
      savedDocTypes: [],
      filledDocTypes: ["dec"],
    });
    expect(plan).toEqual({
      action: "stay",
      error: "Could not save Wind mitigation. Try again.",
    });
    expect(docSaveStayError({ reason: "choose-file", slotLabel: "Photos" })).toBe("Choose a file to upload.");
    expect(docSaveStayError({ reason: "documents-too-large" })).toMatch(/45 MB/);
    expect(docSaveStayError({ reason: "documents-save-failed" })).toBe("Could not save that file. Nothing was stored.");
  });

  it("sends the last HO3 document to Markets, then Quotes once Markets is done", () => {
    const last = planDocSaveAdvance({
      ...base,
      ok: true,
      savedDocTypes: ["photo"],
      filledDocTypes: ["dec", "wind_mit", "four_point"],
    });
    expect(last).toMatchObject({
      action: "task",
      tab: "markets",
      label: "Markets",
      toast: "Saved. Up next: Markets",
      href: "/deals/deal-rosa?tab=markets&line=home&product=homeowners",
    });

    const quoted = planDocSaveAdvance({
      ...base,
      ok: true,
      marketsDone: true,
      savedDocTypes: ["photo"],
      filledDocTypes: ["dec", "wind_mit", "four_point"],
      surface: "documents",
    });
    expect(quoted).toMatchObject({
      action: "task",
      tab: "quotes",
      toast: "Saved. Up next: Quotes",
    });
  });

  it("keeps the next empty slot on the Quotes tab when the save started there", () => {
    const plan = planDocSaveAdvance({
      ...base,
      ok: true,
      surface: "quotes",
      savedDocTypes: ["four_point"],
      filledDocTypes: ["dec", "wind_mit"],
    });
    expect(plan).toMatchObject({
      action: "slot",
      docType: "photo",
      href: "/deals/deal-rosa?tab=quotes&line=home&product=homeowners&docSlot=photo",
    });
  });

  it("opens the next product's first empty document after this product's tasks are done", () => {
    const plan = planDocSaveAdvance({
      ...base,
      ok: true,
      marketsDone: true,
      quotesDone: true,
      savedDocTypes: ["photo"],
      filledDocTypes: ["dec", "wind_mit", "four_point"],
      docs: [
        { docType: "dec", slot: "source_doc", tags: ["line:home"] },
        { docType: "wind_mit", slot: "source_doc", tags: ["line:home"] },
        { docType: "four_point", slot: "source_doc", tags: ["line:home"] },
        { docType: "photo", slot: "source_doc", tags: ["line:home"] },
      ],
      packageProducts: [
        { id: "homeowners", label: "HO3", shopLine: "home", quotingForm: "HO3" },
        { id: "auto", label: "Auto", shopLine: "auto", quotingForm: "PA" },
      ],
    });
    expect(plan).toMatchObject({
      action: "task",
      tab: "documents",
      productId: "auto",
      label: "Auto",
      toast: "Saved. Up next: Auto",
      href: "/deals/deal-rosa?tab=documents&line=auto&product=auto&docSlot=dec",
    });
  });

  it("does not count a quote-file upload as a filled source slot", () => {
    expect(
      filledDocTypesForLine(
        [
          { docType: "agency_quote", slot: "quote_file", tags: ["line:home", "quote:q1"] },
          { docType: "dec", slot: "source_doc", tags: ["line:home"] },
          { docType: "photo", slot: "source_doc", tags: ["line:auto"] },
        ],
        "home",
      ),
    ).toEqual(["dec"]);
    expect(initialDocSlot(slots, ["dec"], "photo")).toBe("photo");
    expect(initialDocSlot(slots, ["dec"])).toBe("wind_mit");
  });
});

describe("document slot tabs", () => {
  it("renders HO3 slots and marks the filled ones", () => {
    const slots = requiredDocSlots(rosaHo3);
    const html = renderToStaticMarkup(
      createElement(DocSlotTabList, {
        slots,
        active: "wind_mit",
        filled: ["dec"],
        onSelect: () => undefined,
      }),
    );
    expect(html).toContain('data-ff-doc-slot-tabs=""');
    expect(html).toContain('data-ff-doc-slot="dec"');
    expect(html).toContain('data-ff-doc-slot="wind_mit"');
    expect(html).toContain('data-ff-doc-slot="four_point"');
    expect(html).toContain('data-ff-doc-slot="photo"');
    expect(html).toContain('data-ff-doc-slot-filled="dec"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("Wind mitigation");
  });
});
