import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bookFillDecNote,
  bookFillFamily,
  classifyBookFillPolicy,
  decideBookFill,
  parseBookFillFamily,
} from "@/lib/policy/book-fill";

const active = { status: "active" as const };

const ho3 = {
  ...active,
  lineOfBusiness: "HO",
  formType: "HO3",
  policyType: "Home",
  policySubType: "HO3",
};

describe("book Fill-from-DEC families", () => {
  it("includes HO3, Auto, DP1/DP3, Flood, and commercial WC/GL/E&O", () => {
    expect(bookFillFamily(ho3)).toBe("ho3");
    expect(bookFillFamily({ ...ho3, policySubType: null, formType: "HO3" })).toBe("ho3");
    expect(bookFillFamily({ lineOfBusiness: "AUTO", formType: "Auto", policyType: "Auto" })).toBe("auto");
    expect(bookFillFamily({ lineOfBusiness: "AUTO", formType: "PA", policySubType: "PA" })).toBe("auto");
    expect(bookFillFamily({ lineOfBusiness: "CA", formType: "Commercial Auto", policyType: "Auto" })).toBe("auto");
    expect(bookFillFamily({ lineOfBusiness: "DP", formType: "DP3", policySubType: "DP3" })).toBe("dp");
    expect(bookFillFamily({ lineOfBusiness: "DP", formType: "DP1", policySubType: "DP1" })).toBe("dp");
    expect(bookFillFamily({ lineOfBusiness: "HO", formType: "DP3", policyType: "Home" })).toBe("dp");
    expect(bookFillFamily({ lineOfBusiness: "FLOOD", formType: "NFIP Flood", policyType: "Flood" })).toBe("flood");
    expect(bookFillFamily({ lineOfBusiness: "FLOOD", formType: "Private Flood" })).toBe("flood");
    expect(bookFillFamily({ lineOfBusiness: "FLOOD", formType: "HO3", policyType: "Home" })).toBe("flood");
    expect(bookFillFamily({ lineOfBusiness: "WC", policyType: "Workers Comp" })).toBe("commercial");
    expect(bookFillFamily({ lineOfBusiness: "GL", formType: "General liability" })).toBe("commercial");
    expect(
      bookFillFamily({
        lineOfBusiness: "GL",
        formType: "Errors & Omissions",
        policySubType: "Errors & Omissions",
      }),
    ).toBe("commercial");
    expect(bookFillFamily({ lineOfBusiness: "GL", policySubType: "Workers' Comp" })).toBe("commercial");
  });

  it("leaves wind-only, HO6, MHO, BOP, and other untrained lines out", () => {
    expect(
      bookFillFamily({
        lineOfBusiness: "HO",
        formType: "HO3 Wind Only",
        policyType: "Home",
        policySubType: "HO3 Wind Only",
      }),
    ).toBeNull();
    expect(bookFillFamily({ lineOfBusiness: "HO", formType: "HO6", policySubType: "HO6 ( Condo)" })).toBeNull();
    expect(bookFillFamily({ lineOfBusiness: "HO", formType: "MHO", policySubType: "MHO" })).toBeNull();
    expect(bookFillFamily({ lineOfBusiness: "HO", formType: "HO5", policyType: "Home" })).toBeNull();
    expect(bookFillFamily({ lineOfBusiness: "HO", policyType: "Home" })).toBeNull();
    expect(bookFillFamily({ lineOfBusiness: "DP", formType: "DP", policyType: "Dwelling" })).toBeNull();
    expect(bookFillFamily({ lineOfBusiness: "BOP", formType: "BOP" })).toBeNull();
    expect(bookFillFamily({ lineOfBusiness: "LIFE", policyType: "Term Life" })).toBeNull();
    expect(bookFillFamily({ lineOfBusiness: "HEALTH", formType: "Marketplace" })).toBeNull();
    expect(bookFillFamily({ lineOfBusiness: "UMBRELLA", policyType: "Umbrella" })).toBeNull();
    expect(bookFillFamily({ ...ho3, formType: "HO3", policySubType: "HO6" })).toBeNull();
  });

  it("names the exclusion", () => {
    expect(classifyBookFillPolicy(ho3).exclude).toBeNull();
    expect(
      classifyBookFillPolicy({
        ...active,
        formType: "HO3 Wind Only",
        policySubType: "HO3 Wind Only",
        lineOfBusiness: "HO",
      }).exclude,
    ).toBe("HO3 Wind Only");
    expect(
      classifyBookFillPolicy({
        ...active,
        formType: "DP3 Wind Only",
        lineOfBusiness: "DP",
      }).exclude,
    ).toBe("wind only");
    expect(
      classifyBookFillPolicy({ ...active, formType: "HO6", policySubType: "HO6 ( Condo)", lineOfBusiness: "HO" })
        .exclude,
    ).toBe("HO6");
    expect(classifyBookFillPolicy({ ...active, formType: "MHO", lineOfBusiness: "HO" }).exclude).toBe("MHO");
    expect(classifyBookFillPolicy({ ...active, formType: "HO5", lineOfBusiness: "HO" }).exclude).toBe("HO5");
    expect(classifyBookFillPolicy({ ...active, formType: "HO4", lineOfBusiness: "HO" }).exclude).toBe("HO4");
    expect(classifyBookFillPolicy({ ...active, lineOfBusiness: "DP", formType: "Dwelling" }).exclude).toBe(
      "DP, not DP1/DP3",
    );
    expect(classifyBookFillPolicy({ ...active, lineOfBusiness: "BOP", formType: "BOP" }).exclude).toBe("BOP");
    expect(classifyBookFillPolicy({ ...active, lineOfBusiness: "UMBRELLA" }).exclude).toBe("umbrella");
    expect(classifyBookFillPolicy({ ...active, lineOfBusiness: "LIFE", policyType: "Term Life" }).exclude).toBe(
      "life",
    );
    expect(classifyBookFillPolicy({ ...active, formType: "Marketplace", lineOfBusiness: "HEALTH" }).exclude).toBe(
      "health",
    );
    expect(classifyBookFillPolicy({ ...active, lineOfBusiness: "HO", policyType: "Home" }).exclude).toBe(
      "home, not form HO3",
    );
    expect(classifyBookFillPolicy({ ...active, lineOfBusiness: "COMMERCIAL" }).exclude).toBe(
      "commercial, not WC/GL/E&O",
    );
    expect(classifyBookFillPolicy({ ...active, lineOfBusiness: "RV", formType: "RV" }).exclude).toBe("RV");
    expect(classifyBookFillPolicy({ lineOfBusiness: "PET", policyType: "Pet" }).exclude).toBe("unsupported family");
    expect(
      classifyBookFillPolicy({
        ...active,
        lineOfBusiness: "HO3",
        formType: "Errors & Omissions",
      }).exclude,
    ).toBe("E&O on an untrained line");
  });

  it("keeps in-force policies and names ended ones", () => {
    expect(classifyBookFillPolicy({ ...ho3, status: "active" }).exclude).toBeNull();
    expect(classifyBookFillPolicy({ ...ho3, status: "bound" }).exclude).toBeNull();
    expect(classifyBookFillPolicy({ ...ho3, status: "pending" }).exclude).toBeNull();
    expect(classifyBookFillPolicy({ ...ho3, status: "lapsed" }).exclude).toBe("not active (Lapsed)");
    expect(classifyBookFillPolicy({ ...ho3, status: "cancelled" }).exclude).toBe("not active (Cancelled)");
    expect(classifyBookFillPolicy({ ...ho3, status: "expired" }).exclude).toBe("not active (Expired)");
    expect(classifyBookFillPolicy({ ...ho3, status: "non_renewed" }).exclude).toBe("not active (Non-renewed)");
    expect(classifyBookFillPolicy({ ...ho3, status: "unpublished" }).exclude).toBe("not active (Unpublished)");
    expect(classifyBookFillPolicy({ ...ho3, status: "lapsed" }).family).toBe("ho3");
  });

  it("limits a family pass without hiding the real family", () => {
    expect(parseBookFillFamily("HO3")).toBe("ho3");
    expect(parseBookFillFamily("all")).toBe("all");
    expect(parseBookFillFamily("boat")).toBeNull();
    const auto = { ...active, lineOfBusiness: "AUTO", formType: "Auto", policyType: "Auto" };
    expect(classifyBookFillPolicy(auto, "ho3")).toEqual({
      family: "auto",
      exclude: "family auto; this pass is ho3",
    });
    expect(classifyBookFillPolicy(ho3, "ho3").exclude).toBeNull();
    expect(classifyBookFillPolicy(auto, "all").exclude).toBeNull();
  });
});

describe("book Fill-from-DEC decisions", () => {
  it("fills a trained in-force policy that has a DEC and excludes a missing DEC", () => {
    expect(decideBookFill({ policy: ho3, dec: { ok: true } })).toEqual({
      decision: "fill",
      family: "ho3",
      note: "",
    });
    expect(decideBookFill({ policy: ho3, dec: { ok: false, error: "No declaration page on this policy." } })).toEqual({
      decision: "exclude",
      family: "ho3",
      note: "no DEC",
    });
    expect(bookFillDecNote("Declaration not on this policy.")).toBe("Declaration not on this policy.");
  });

  it("does not treat a previous fill as a skip", () => {
    const again = decideBookFill({ policy: ho3, dec: { ok: true } });
    expect(again.decision).toBe("fill");
    expect(again.note).toBe("");
    const script = readFileSync("scripts/ff-fill-book-from-dec.ts", "utf8");
    expect(script).toMatch(/Already filled is not a skip/);
    expect(script).toMatch(/confirmOverwrite: true/);
    expect(script).toMatch(/preferCurrent: true/);
    expect(script).not.toMatch(/if \(prior\) continue/);
  });

  it("excludes an untrained line even when a DEC is on file", () => {
    expect(
      decideBookFill({
        policy: { ...active, lineOfBusiness: "HO", formType: "HO6", policySubType: "HO6" },
        dec: { ok: true },
      }),
    ).toEqual({ decision: "exclude", family: "", note: "HO6" });
  });
});

describe("book Fill-from-DEC runner", () => {
  it("dry-runs unless --apply and prints family plus the declaration name", () => {
    const script = readFileSync("scripts/ff-fill-book-from-dec.ts", "utf8");
    expect(script).toMatch(/decideBookFill/);
    expect(script).toMatch(/classifyBookFillPolicy/);
    expect(script).toMatch(/loadFillDecDocument/);
    expect(script).toMatch(/preferCurrent: true/);
    expect(script).toMatch(/fillPolicyFromDec/);
    expect(script).toMatch(/--family/);
    expect(script).toMatch(/\["decision", "policyNumber", "insured", "carrier", "family", "policyId", "dec", "note"\]/);
    expect(script).toMatch(/argv\.includes\("--apply"\)/);
    const wrapper = readFileSync("scripts/ff-fill-ho3-from-dec.ts", "utf8");
    expect(wrapper).toMatch(/from "\.\/ff-fill-book-from-dec"/);
    expect(wrapper).toMatch(/\brun\(\)/);
    expect(wrapper).toMatch(/"ho3"/);
  });
});
