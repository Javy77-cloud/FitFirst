import { describe, expect, it } from "vitest";
import { isAgencyChannelProducer } from "./producer";

describe("isAgencyChannelProducer", () => {
  it("treats empty as non-person", () => {
    expect(isAgencyChannelProducer(null)).toBe(true);
    expect(isAgencyChannelProducer("")).toBe(true);
    expect(isAgencyChannelProducer("   ")).toBe(true);
  });

  it("flags known channel codes including AFA", () => {
    expect(isAgencyChannelProducer("AFA")).toBe(true);
    expect(isAgencyChannelProducer("afa")).toBe(true);
    expect(isAgencyChannelProducer("BackNine")).toBe(true);
    expect(isAgencyChannelProducer("Back Nine")).toBe(true);
  });

  it("flags short all-caps acronyms", () => {
    expect(isAgencyChannelProducer("HOI")).toBe(true);
  });

  it("keeps human names", () => {
    expect(isAgencyChannelProducer("Javy Rivera")).toBe(false);
    expect(isAgencyChannelProducer("Francisco Javier Garcia")).toBe(false);
    expect(isAgencyChannelProducer("Maya Chen")).toBe(false);
  });
});
