import { describe, expect, it } from "vitest";
import { RENEWAL_QUEUE_DISCLAIMER } from "@/lib/domain-ams";
import {
  isOpenRenewalQueue,
  nextRenewalQueueStage,
  renewalQueueBindsPolicy,
  renewalQueueChangesPolicy,
  renewalQueueLine,
} from "./renewal-queue";

describe("renewal pipeline board stages", () => {
  it("moves upcoming → contacted → quoted → bound without binding", () => {
    expect(nextRenewalQueueStage("upcoming", "contact")).toBe("contacted");
    expect(nextRenewalQueueStage("contacted", "quote")).toBe("quoted");
    expect(nextRenewalQueueStage("quoted", "bind")).toBe("bound");
    expect(nextRenewalQueueStage("quoted", "lose")).toBe("lost");
    expect(nextRenewalQueueStage("contacted", "bind")).toBeNull();
    expect(nextRenewalQueueStage("bound", "reset")).toBe("upcoming");
    expect(renewalQueueChangesPolicy()).toBe(false);
    expect(renewalQueueBindsPolicy()).toBe(false);
    expect(isOpenRenewalQueue("contacted")).toBe(true);
    expect(isOpenRenewalQueue("bound")).toBe(false);
    expect(renewalQueueLine("HP-FL-88421", "contacted")).toContain("HP-FL-88421");
    expect(RENEWAL_QUEUE_DISCLAIMER.toLowerCase()).toContain("does not bind");
  });

  it("accepts legacy action aliases", () => {
    expect(nextRenewalQueueStage("upcoming", "quote_legacy")).toBe("contacted");
    expect(nextRenewalQueueStage("contacted", "offer")).toBe("quoted");
    expect(nextRenewalQueueStage("quoted", "accept")).toBe("bound");
  });
});
