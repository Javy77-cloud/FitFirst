import { describe, expect, it } from "vitest";
import { bindableEnglish, englishCoverageGaps, explainQuoteCompare } from "./explain";

describe("quote compare English", () => {
  it("explains cheapest vs more expensive with deductibles and gaps", () => {
    const explained = explainQuoteCompare([
      {
        id: "ai",
        carrierName: "American Integrity",
        premium: "5607.53",
        aopDeductible: "$2,500",
        hurricaneDeductible: "2%",
        coverageA: 385000,
        bindable: true,
        coverageGaps: [],
      },
      {
        id: "cit",
        carrierName: "Citizens",
        premium: "6800",
        aopDeductible: "$5,000",
        hurricaneDeductible: "5%",
        coverageA: 385000,
        bindable: false,
        coverageGaps: ["No opening protection credit"],
        stub: true,
      },
    ]);

    expect(explained.summary).toMatch(/American Integrity/);
    expect(explained.summary).toMatch(/Closed Won bind/);
    expect(explained.rows[0]?.headline).toBe("Cheapest quoted option");
    expect(explained.rows[0]?.why).toMatch(/cheapest quoted premium/);
    expect(explained.rows[1]?.why).toMatch(/\$1,192\.47 more/);
    expect(explained.rows[1]?.why).toMatch(/AOP deductible is \$5,000 here versus \$2,500/);
    expect(explained.rows[1]?.why).toMatch(/opening-protection credit/);
    expect(explained.rows[1]?.why).toMatch(/Not bindable/);
    expect(explained.rows[1]?.why).toMatch(/Stub quote/);
  });

  it("locks Ana shop language and never invites a bind", () => {
    const explained = explainQuoteCompare(
      [
        {
          id: "ai",
          carrierName: "American Integrity",
          premium: 5607.53,
          coverageA: 321000,
          bindable: false,
          coverageGaps: [],
        },
      ],
      { isAna: true },
    );
    expect(explained.summary).toMatch(/Do not bind Ana/);
    expect(explained.summary).toMatch(/\$321,000/);
    expect(explained.rows[0]?.bindableEnglish).toMatch(/Do not bind Ana/);
    expect(explained.rows[0]?.why).not.toMatch(/write a Contact/);
  });

  it("says an empty shop is not coverage", () => {
    const empty = explainQuoteCompare([]);
    expect(empty.summary).toMatch(/never creates a policy/);
    expect(explainQuoteCompare([], { isAna: true }).summary).toMatch(/Do not bind Ana/);
  });

  it("translates known gap strings into English", () => {
    expect(englishCoverageGaps(["No opening protection credit"])).toMatch(/wind premium/);
    expect(englishCoverageGaps([])).toMatch(/No coverage gaps noted/);
    expect(bindableEnglish(true)).toMatch(/Contact or Business plus one Policy/);
    expect(bindableEnglish(false, true)).toMatch(/Do not bind Ana/);
  });
});
