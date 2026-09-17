import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mapboxAccessToken, mapboxAutocompleteEnabled, suggestMapboxAddresses } from "./client";

const sourceClient = readFileSync("src/lib/mapbox/client.ts", "utf8");

function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const PREV = {
  MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
};

afterEach(() => {
  process.env.MAPBOX_ACCESS_TOKEN = PREV.MAPBOX_ACCESS_TOKEN;
  process.env.MAPBOX_TOKEN = PREV.MAPBOX_TOKEN;
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN = PREV.NEXT_PUBLIC_MAPBOX_TOKEN;
});

describe("Mapbox geocoding client", () => {
  it("treats a missing token as disabled and never logs", () => {
    delete process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.MAPBOX_TOKEN;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    expect(mapboxAccessToken()).toBeNull();
    expect(mapboxAutocompleteEnabled()).toBe(false);
    expect(sourceClient).not.toMatch(/console\.log/);
  });

  it("accepts NEXT_PUBLIC_MAPBOX_TOKEN as a fallback", () => {
    delete process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.MAPBOX_TOKEN;
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test-public";
    expect(mapboxAutocompleteEnabled()).toBe(true);
  });

  it("calls Mapbox places autocomplete and never puts the token in source logs", async () => {
    process.env.MAPBOX_ACCESS_TOKEN = "pk.test-secret";
    const fetchImpl = vi.fn(async (url: string) => {
      expect(String(url)).toContain("api.mapbox.com/geocoding/v5/mapbox.places/");
      expect(String(url)).toContain("autocomplete=true");
      expect(String(url)).toContain("types=address");
      return jsonRes({
        features: [
          {
            id: "address.1",
            place_name: "412 Harbor Isle Dr, Melbourne, Florida 32935, United States",
            address: "412",
            text: "Harbor Isle Dr",
            context: [
              { id: "postcode.1", text: "32935" },
              { id: "place.1", text: "Melbourne" },
              { id: "region.1", short_code: "US-FL", text: "Florida" },
            ],
          },
        ],
      });
    });
    const rows = await suggestMapboxAddresses("412 Harbor", fetchImpl);
    expect(rows[0]?.address.city).toBe("Melbourne");
    expect(rows[0]?.address.zip).toBe("32935");
    expect(sourceClient).not.toMatch(/console\.log/);
  });

  it("does not call Mapbox when the query is too short or the token is missing", async () => {
    const fetchImpl = vi.fn();
    delete process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.MAPBOX_TOKEN;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    await expect(suggestMapboxAddresses("412 Harbor", fetchImpl)).resolves.toEqual([]);
    process.env.MAPBOX_ACCESS_TOKEN = "pk.test";
    await expect(suggestMapboxAddresses("41", fetchImpl)).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
