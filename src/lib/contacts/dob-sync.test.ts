import { describe, expect, it } from "vitest";
import {
  dobFromDealSources,
  emptyOnlyDobPatch,
  firstParseableDob,
  formatDobMdy,
  parseDobToIso,
} from "./dob-sync";

describe("DOB parse + display", () => {
  it("accepts ISO and MM/DD/YYYY and never invents", () => {
    expect(parseDobToIso("1965-03-22")).toBe("1965-03-22");
    expect(parseDobToIso("03/22/1965")).toBe("1965-03-22");
    expect(parseDobToIso("3-22-1965")).toBe("1965-03-22");
    expect(parseDobToIso("1965/03/22")).toBeNull();
    expect(parseDobToIso("not a date")).toBeNull();
    expect(parseDobToIso("")).toBeNull();
    expect(parseDobToIso("2026-13-40")).toBeNull();
  });

  it("shows MM/DD/YYYY and never year-first ISO", () => {
    expect(formatDobMdy("1965-03-22")).toBe("03/22/1965");
    expect(formatDobMdy("3/22/1965")).toBe("03/22/1965");
    expect(formatDobMdy("")).toBe("—");
    expect(formatDobMdy("bogus")).toBe("—");
    expect(formatDobMdy("1965-03-22")).not.toMatch(/^1965-/);
  });

  it("pulls the first real DOB from deal / alias / lead / sheet bags", () => {
    expect(
      dobFromDealSources({
        dealValues: { date_of_birth: "", applicant_dob: "03/22/1965" },
        leadDob: "1990-01-01",
      }),
    ).toBe("1965-03-22");
    expect(
      dobFromDealSources({
        dealValues: { date_of_birth: "" },
        leadDob: "",
        sheetValues: { dob: { value: "1965-03-22" } },
      }),
    ).toBe("1965-03-22");
    expect(dobFromDealSources({ dealValues: { date_of_birth: "" } })).toBeNull();
    expect(firstParseableDob("", "n/a", "03/22/1965")).toBe("1965-03-22");
  });

  it("copies deal DOB onto a blank contact only", () => {
    expect(emptyOnlyDobPatch("", "03/22/1965")).toEqual({ date_of_birth: "1965-03-22" });
    expect(emptyOnlyDobPatch("1960-01-02", "03/22/1965")).toBeNull();
    expect(emptyOnlyDobPatch("", "")).toBeNull();
    expect(emptyOnlyDobPatch("already", "03/22/1965")).toEqual({ date_of_birth: "1965-03-22" });
  });
});
