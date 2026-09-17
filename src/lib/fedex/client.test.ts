import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const sourceClient = readFileSync("src/lib/fedex/client.ts", "utf8");
import {
  fedexBaseUrl,
  fedexCredentialsReady,
  fetchFedExAccessToken,
  resetFedExTokenCache,
  suggestFedExAddresses,
  verifyFedExAddress,
  type FedExCredentials,
} from "./client";

const CREDS: FedExCredentials = {
  apiKey: "demo-key",
  apiSecret: "demo-secret",
  environment: "sandbox",
};

function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

afterEach(() => {
  resetFedExTokenCache();
});

describe("FedEx Address API client", () => {
  it("points sandbox and production at the documented FedEx hosts", () => {
    expect(fedexBaseUrl("sandbox")).toBe("https://apis-sandbox.fedex.com");
    expect(fedexBaseUrl("production")).toBe("https://apis.fedex.com");
  });

  it("does not treat a missing key as ready", () => {
    expect(fedexCredentialsReady(null)).toBe(false);
    expect(fedexCredentialsReady({ apiKey: "", apiSecret: "x", environment: "sandbox" })).toBe(false);
    expect(fedexCredentialsReady(CREDS)).toBe(true);
  });

  it("requests an OAuth token then resolve, and never logs the secret", () => {
    const calls: { url: string; body?: string; headers?: Record<string, string> }[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: { body?: string; headers?: Record<string, string> }) => {
      calls.push({ url, body: init?.body, headers: init?.headers });
      if (String(url).includes("/oauth/token")) {
        return jsonRes({ access_token: "tok-1", expires_in: 3600 });
      }
      return jsonRes({
        output: {
          resolvedAddresses: [
            {
              streetLines: ["412 Harbor Isle Dr"],
              city: "Melbourne",
              stateOrProvinceCode: "FL",
              postalCode: "32935",
              countryCode: "US",
            },
          ],
        },
      });
    });

    return suggestFedExAddresses("412 Harbor", CREDS, fetchImpl).then((rows) => {
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(calls[0]?.url).toBe("https://apis-sandbox.fedex.com/oauth/token");
      expect(calls[0]?.body).toContain("grant_type=client_credentials");
      expect(calls[1]?.url).toBe("https://apis-sandbox.fedex.com/address/v1/addresses/resolve");
      expect(calls[1]?.headers?.authorization).toBe("Bearer tok-1");
      expect(sourceClient).not.toMatch(/console\.log/);
      expect(rows[0]?.address.city).toBe("Melbourne");
      expect(rows[0]?.address.zip).toBe("32935");
    });
  });

  it("does not call FedEx when credentials are missing", async () => {
    const fetchImpl = vi.fn();
    await expect(
      fetchFedExAccessToken({ apiKey: "", apiSecret: "", environment: "sandbox" }, fetchImpl),
    ).rejects.toThrow(/not configured/);
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(suggestFedExAddresses("412 Harbor", { apiKey: "", apiSecret: "", environment: "sandbox" }, fetchImpl)).resolves.toEqual(
      [],
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("verifies a complete address and reports a suggested correction", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes("/oauth/token")) {
        return jsonRes({ access_token: "tok-1", expires_in: 3600 });
      }
      return jsonRes({
        output: {
          resolvedAddresses: [
            {
              streetLines: ["412 Harbor Isle Dr"],
              city: "Melbourne",
              stateOrProvinceCode: "FL",
              postalCode: "32935",
              countryCode: "US",
            },
          ],
        },
      });
    });
    const result = await verifyFedExAddress(
      {
        street: "412 Harbor Isle Drive",
        city: "Melbourne",
        state: "FL",
        zip: "32935",
        county: "",
        country: "US",
      },
      CREDS,
      fetchImpl,
    );
    expect(result.status).toBe("verified");
    expect(result.resolved?.zip).toBe("32935");

    const suggested = await verifyFedExAddress(
      {
        street: "412 Harbor Isle Dr",
        city: "Melborne",
        state: "FL",
        zip: "32935",
        county: "",
        country: "US",
      },
      CREDS,
      fetchImpl,
    );
    expect(suggested.status).toBe("suggested");
    expect(suggested.resolved?.city).toBe("Melbourne");
    expect(sourceClient).toMatch(/verifyFedExAddress/);
  });

  it("does not label OAuth or 5xx failures as an unmatched address", async () => {
    const oauthFail = vi.fn(async () => jsonRes({ errors: [{ code: "UNAUTHORIZED" }] }, 401));
    await expect(verifyFedExAddress({
      street: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      county: "",
      country: "US",
    }, CREDS, oauthFail)).resolves.toMatchObject({ status: "error", errorKind: "auth" });

    const transport = vi.fn(async (url: string) => {
      if (String(url).includes("/oauth/token")) return jsonRes({ access_token: "tok-1", expires_in: 3600 });
      return jsonRes({ errors: [{ code: "DOWN" }] }, 503);
    });
    await expect(verifyFedExAddress({
      street: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      county: "",
      country: "US",
    }, CREDS, transport)).resolves.toMatchObject({ status: "error", errorKind: "transport" });
  });

  it("posts a structured US address after a Mapbox-style fill", async () => {
    const bodies: string[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: { body?: string }) => {
      if (String(url).includes("/oauth/token")) return jsonRes({ access_token: "tok-1", expires_in: 3600 });
      bodies.push(String(init?.body ?? ""));
      return jsonRes({
        output: {
          resolvedAddresses: [
            {
              streetLinesToken: ["412 Harbor Isle Dr"],
              city: "Melbourne",
              stateOrProvinceCode: "FL",
              postalCode: "32935",
              countryCode: "US",
            },
          ],
        },
      });
    });
    const result = await verifyFedExAddress(
      {
        street: "412 Harbor Isle Dr",
        city: "Melbourne",
        state: "FL",
        zip: "32935",
        county: "Brevard",
        country: "US",
      },
      CREDS,
      fetchImpl,
    );
    expect(result.status).toBe("verified");
    expect(bodies[0]).toContain('"streetLines":["412 Harbor Isle Dr"]');
    expect(bodies[0]).toContain('"countryCode":"US"');
    expect(bodies[0]).toContain('"stateOrProvinceCode":"FL"');
    expect(bodies[0]).not.toContain("includeResolutionTokens");
  });
});
