import { describe, expect, it } from "vitest";
import {
  formatPremisesDisplay,
  formatPremisesLines,
  formatPremisesStacked,
  premisesLinesEqual,
  splitPremisesAddress,
  streetOnlyPremises,
  stripLocalityFromStreet,
} from "./premises";

describe("street-only premises", () => {
  it("never concatenates city/state/zip into premises_address", () => {
    const rosa = splitPremisesAddress("15280 Tropic Ct", {
      city: "Fort Myers",
      state: "FL",
      zip: "33967",
    });
    expect(rosa.street).toBe("15280 Tropic Ct");
    expect(rosa.city).toBe("Fort Myers");
    expect(rosa.state).toBe("FL");
    expect(rosa.zip).toBe("33967");
    expect(streetOnlyPremises("15280 Tropic Ct, Fort Myers, FL 33967")).toBe("15280 Tropic Ct");
  });

  it("strips city/state/zip already sitting on the street (Rosa doubled Fort Myers)", () => {
    expect(
      stripLocalityFromStreet("15280 Tropic Ct, Fort Myers, FL 33967", {
        city: "Fort Myers",
        state: "FL",
        zip: "33967",
      }),
    ).toBe("15280 Tropic Ct");
    expect(
      stripLocalityFromStreet("15280 Tropic Ct Fort Myers FL 33967", {
        city: "Fort Myers",
        state: "FL",
        zip: "33967",
      }),
    ).toBe("15280 Tropic Ct");
  });

  it("builds a display line without repeating Fort Myers FL 33967", () => {
    const line = formatPremisesDisplay({
      address: "15280 Tropic Ct, Fort Myers, FL 33967",
      city: "Fort Myers",
      state: "FL",
      zip: "33967",
    });
    expect(line).toBe("15280 Tropic Ct, Fort Myers, FL, 33967");
    expect(line?.match(/Fort Myers/g)).toHaveLength(1);
    expect(line?.match(/33967/g)).toHaveLength(1);
  });

  it("treats a street-only location label as the same insured location", () => {
    expect(
      premisesLinesEqual("15280 Tropic Ct", "15280 Tropic Ct, Fort Myers, FL, 33967"),
    ).toBe(true);
    expect(premisesLinesEqual("PO Box 100", "15280 Tropic Ct, Fort Myers, FL, 33967")).toBe(
      false,
    );
  });

  it("stacks street over city-state-zip for denser Overview cells", () => {
    const lines = formatPremisesLines({
      address: "15280 Tropic Ct, Fort Myers, FL 33967",
      city: "Fort Myers",
      state: "FL",
      zip: "33967",
    });
    expect(lines).toEqual({
      street: "15280 Tropic Ct",
      locality: "Fort Myers, FL 33967",
    });
    expect(
      formatPremisesStacked({
        address: "15280 Tropic Ct",
        city: "Fort Myers",
        state: "FL",
        zip: "33967",
      }),
    ).toBe("15280 Tropic Ct\nFort Myers, FL 33967");
  });

  it("always returns two lines even when street or locality is missing", () => {
    expect(
      formatPremisesStacked({
        address: "15280 Tropic Ct",
        city: null,
        state: null,
        zip: null,
      }),
    ).toBe("15280 Tropic Ct\n");
    expect(
      formatPremisesStacked({
        address: "",
        city: "Fort Myers",
        state: "FL",
        zip: "33967",
      }),
    ).toBe("\nFort Myers, FL 33967");
    expect(formatPremisesStacked({ address: null, city: null, state: null, zip: null })).toBe(
      null,
    );
  });
});
