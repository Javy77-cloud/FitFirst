import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fedexEnabled = vi.fn(async () => false);
const loadCreds = vi.fn(async () => null);
const mapboxEnabled = vi.fn(() => false);
const suggestMapbox = vi.fn(async () => []);
const verifyFedEx = vi.fn(async () => ({
  status: "unmatched" as const,
  resolved: null,
  suggestions: [],
}));

vi.mock("@/lib/developer/vault", () => ({
  fedexAddressEnabled: () => fedexEnabled(),
  loadFedExCredentials: () => loadCreds(),
}));

vi.mock("@/lib/mapbox/client", () => ({
  mapboxAutocompleteEnabled: () => mapboxEnabled(),
  suggestMapboxAddresses: (q: string) => suggestMapbox(q),
}));

vi.mock("@/lib/fedex/client", () => ({
  verifyFedExAddress: (...args: unknown[]) => verifyFedEx(...args),
}));

import { GET as statusGet } from "./status/route";
import { GET as suggestGet } from "./suggest/route";
import { GET as verifyGet, POST as verifyPost } from "./verify/route";

const HARBOR = {
  id: "mapbox-1",
  label: "412 Harbor Isle Dr, Melbourne, FL 32935",
  address: {
    street: "412 Harbor Isle Dr",
    city: "Melbourne",
    state: "FL",
    zip: "32935",
    county: "Brevard",
    country: "US",
  },
};

describe("address API routes", () => {
  beforeEach(() => {
    fedexEnabled.mockResolvedValue(false);
    loadCreds.mockResolvedValue(null);
    mapboxEnabled.mockReturnValue(false);
    suggestMapbox.mockResolvedValue([]);
    verifyFedEx.mockResolvedValue({ status: "unmatched", resolved: null, suggestions: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reports Mapbox autocomplete and FedEx verify separately", async () => {
    mapboxEnabled.mockReturnValue(true);
    fedexEnabled.mockResolvedValue(true);
    const res = await statusGet();
    await expect(res.json()).resolves.toEqual({
      enabled: true,
      verifyEnabled: true,
      autocomplete: "mapbox",
      verify: "fedex",
    });
  });

  it("suggests via Mapbox only", async () => {
    mapboxEnabled.mockReturnValue(true);
    suggestMapbox.mockResolvedValue([HARBOR]);
    const res = await suggestGet(new Request("http://local/api/address/suggest?q=412%20Harbor"));
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.suggestions[0].address.city).toBe("Melbourne");
    expect(suggestMapbox).toHaveBeenCalledWith("412 Harbor");
    expect(verifyFedEx).not.toHaveBeenCalled();
    expect(loadCreds).not.toHaveBeenCalled();
  });

  it("does not typeahead on FedEx verify GET", async () => {
    const res = await verifyGet();
    expect(res.status).toBe(405);
    expect(verifyFedEx).not.toHaveBeenCalled();
  });

  it("verifies a complete address through FedEx POST", async () => {
    loadCreds.mockResolvedValue({ apiKey: "k", apiSecret: "s", environment: "sandbox" });
    verifyFedEx.mockResolvedValue({
      status: "suggested",
      resolved: HARBOR.address,
      suggestions: [HARBOR],
    });
    const res = await verifyPost(
      new Request("http://local/api/address/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          street: "412 Harbor Isle Dr",
          city: "Melborne",
          state: "FL",
          zip: "32935",
        }),
      }),
    );
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.status).toBe("suggested");
    expect(body.resolved.city).toBe("Melbourne");
    expect(verifyFedEx).toHaveBeenCalledTimes(1);
    expect(suggestMapbox).not.toHaveBeenCalled();
  });

  it("does not call FedEx when the block is incomplete", async () => {
    loadCreds.mockResolvedValue({ apiKey: "k", apiSecret: "s", environment: "sandbox" });
    const res = await verifyPost(
      new Request("http://local/api/address/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ street: "412 Harbor" }),
      }),
    );
    await expect(res.json()).resolves.toMatchObject({ status: "incomplete", enabled: true });
    expect(verifyFedEx).not.toHaveBeenCalled();
  });
});
