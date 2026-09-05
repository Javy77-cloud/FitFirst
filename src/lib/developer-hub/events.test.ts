import { describe, expect, it } from "vitest";
import { isLocalDeliveryUrl } from "./events";
import { prefixFromSecret, hashOrgApiKey } from "./keys";
import { slugifyApiName } from "./types";

describe("isLocalDeliveryUrl", () => {
  it("allows localhost HTTP and rejects remote hosts", () => {
    expect(isLocalDeliveryUrl("http://127.0.0.1:43147/api/dev/webhooks/inbound/desk-echo")).toBe(true);
    expect(isLocalDeliveryUrl("http://localhost:9/hook")).toBe(true);
    expect(isLocalDeliveryUrl("https://hooks.example.com/desk")).toBe(false);
    expect(isLocalDeliveryUrl("not-a-url")).toBe(false);
    expect(isLocalDeliveryUrl("ftp://127.0.0.1/x")).toBe(false);
  });
});

describe("org api key helpers", () => {
  it("hashes stably and prefixes the visible stub", () => {
    const secret = "ffk_devhub_demo";
    expect(hashOrgApiKey(secret)).toHaveLength(64);
    expect(hashOrgApiKey(secret)).toBe(hashOrgApiKey(secret));
    expect(prefixFromSecret(secret)).toBe("ffk_devhub_");
  });
});

describe("slugifyApiName", () => {
  it("normalizes names to apiName slugs", () => {
    expect(slugifyApiName("Echo payload")).toBe("echo_payload");
    expect(slugifyApiName("")).toBe("untitled");
  });
});
