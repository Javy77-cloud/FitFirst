import { describe, expect, it } from "vitest";
import {
  classifyHealthSherpaContactMatch,
  healthSherpaMatchReasonLabel,
  healthSherpaMatchStatus,
  healthSherpaReviewHref,
  isStrongHealthSherpaMatch,
} from "./contact-match";

const BOOK_ID = "11111111-1111-4111-8111-111111111199";

const book = [
  {
    id: BOOK_ID,
    firstName: "Renewal",
    lastName: "Person",
    email: "renewal.person@book.test",
    phone: "3215550100",
    source: "healthsherpa",
    sourceId: "hs-contact-77",
  },
  {
    id: "22222222-2222-4222-8222-222222222299",
    firstName: "Other",
    lastName: "Client",
    email: "other.client@book.test",
    phone: "4075550199",
    source: null,
    sourceId: null,
  },
];

describe("classifyHealthSherpaContactMatch", () => {
  it("auto-links a HealthSherpa source id", () => {
    const hit = classifyHealthSherpaContactMatch(book, {
      firstName: "Renewal",
      lastName: "Person",
      hsContactId: "hs-contact-77",
      email: "different@hs.test",
    });
    expect(hit.kind).toBe("hs_source_id");
    expect(hit.contact?.id).toBe(BOOK_ID);
    expect(isStrongHealthSherpaMatch(hit.kind)).toBe(true);
    expect(healthSherpaMatchStatus(hit.kind)).toBe("linked");
  });

  it("auto-links a FitFirst UUID external_id", () => {
    const hit = classifyHealthSherpaContactMatch(book, {
      firstName: "Someone",
      lastName: "Else",
      externalId: BOOK_ID,
    });
    expect(hit.kind).toBe("fitfirst_id");
    expect(hit.contact?.id).toBe(BOOK_ID);
    expect(isStrongHealthSherpaMatch(hit.kind)).toBe(true);
  });

  it("auto-links an exact email even when the name differs", () => {
    const hit = classifyHealthSherpaContactMatch(book, {
      firstName: "Ren",
      lastName: "P",
      email: "renewal.person@book.test",
    });
    expect(hit.kind).toBe("email");
    expect(hit.contact?.id).toBe(BOOK_ID);
    expect(isStrongHealthSherpaMatch(hit.kind)).toBe(true);
  });

  it("auto-links an exact phone even when the name differs", () => {
    const hit = classifyHealthSherpaContactMatch(book, {
      firstName: "Ren",
      lastName: "P",
      phone: "(321) 555-0100",
    });
    expect(hit.kind).toBe("phone");
    expect(hit.contact?.id).toBe(BOOK_ID);
    expect(isStrongHealthSherpaMatch(hit.kind)).toBe(true);
  });

  it("treats name-only as weak review, not a silent merge", () => {
    const hit = classifyHealthSherpaContactMatch(book, {
      firstName: "Renewal",
      lastName: "Person",
      email: "renewal.person+hs@other.test",
      phone: "9995550000",
    });
    expect(hit.kind).toBe("name");
    expect(hit.contact?.id).toBe(BOOK_ID);
    expect(isStrongHealthSherpaMatch(hit.kind)).toBe(false);
    expect(healthSherpaMatchStatus(hit.kind)).toBe("needs_review");
  });

  it("sends a brand-new identity to unmatched review instead of auto-create", () => {
    const hit = classifyHealthSherpaContactMatch(book, {
      firstName: "Brand",
      lastName: "New",
      email: "brand.new@hs.test",
    });
    expect(hit.kind).toBe("none");
    expect(hit.contact).toBeNull();
    expect(healthSherpaMatchStatus(hit.kind)).toBe("unmatched");
  });

  it("does not treat a non-UUID HealthSherpa external_id as a FitFirst id", () => {
    const hit = classifyHealthSherpaContactMatch(book, {
      firstName: "Brand",
      lastName: "New",
      externalId: "CRM789012",
    });
    expect(hit.kind).toBe("none");
  });

  it("labels review reasons and deep-links the queue", () => {
    expect(healthSherpaMatchReasonLabel("name")).toBe("name only");
    expect(healthSherpaMatchReasonLabel("none")).toBe("no match");
    expect(healthSherpaReviewHref("e1")).toBe("/contacts/healthsherpa-review?enrollment=e1");
    expect(healthSherpaReviewHref(null)).toBe("/contacts/healthsherpa-review");
  });
});
