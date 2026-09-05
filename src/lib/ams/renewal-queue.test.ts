import { describe, expect, it } from "vitest";
import { RENEWAL_QUEUE_DISCLAIMER } from "@/lib/domain-ams";
import {
  isOpenRenewalQueue,
  nextRenewalQueueStage,
  renewalQueueBindsPolicy,
  renewalQueueChangesPolicy,
  renewalQueueLine,
} from "./renewal-queue";

describe("renewal pipeline queue stub", () => {
  it("moves Hale upcoming → quoting → offered without binding", () => {
    expect(nextRenewalQueueStage("upcoming", "quote")).toBe("quoting");
    expect(nextRenewalQueueStage("quoting", "offer")).toBe("offered");
    expect(nextRenewalQueueStage("offered", "accept")).toBe("accepted");
    expect(nextRenewalQueueStage("offered", "lose")).toBe("lost");
    expect(nextRenewalQueueStage("quoting", "accept")).toBeNull();
    expect(nextRenewalQueueStage("accepted", "reset")).toBe("upcoming");
    expect(renewalQueueChangesPolicy()).toBe(false);
    expect(renewalQueueBindsPolicy()).toBe(false);
    expect(isOpenRenewalQueue("quoting")).toBe(true);
    expect(isOpenRenewalQueue("accepted")).toBe(false);
    expect(renewalQueueLine("HP-FL-88421", "quoting")).toContain("HP-FL-88421");
    expect(RENEWAL_QUEUE_DISCLAIMER.toLowerCase()).toContain("does not bind");
  });
});
