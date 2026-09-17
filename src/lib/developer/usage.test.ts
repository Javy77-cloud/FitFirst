import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildUsageTiles,
  currentUsageMonth,
  envMonthlyLimit,
  NOT_COUNTED_YET,
  noteDeveloperApiCall,
  setDeveloperApiUsageSink,
} from "./usage";

describe("developer API usage tiles", () => {
  afterEach(() => {
    setDeveloperApiUsageSink(null);
  });

  it("uses UTC YYYY-MM and never invents a count for uninstrumented meters", () => {
    expect(currentUsageMonth(new Date("2026-09-17T12:00:00.000Z"))).toBe("2026-09");
    const tiles = buildUsageTiles({
      month: "2026-09",
      counts: { mapbox: 4, gemini: 1 },
      limits: { mapbox: 100 },
    });
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
    expect(byId.mapbox).toMatchObject({
      instrumented: true,
      count: 4,
      limit: 100,
      statusLabel: "4 / 100 this month",
    });
    expect(byId.gemini?.statusLabel).toBe("1 this month");
    expect(byId.fedex?.count).toBe(0);
    expect(byId.fedex?.statusLabel).toBe("0 this month");
    expect(byId.permitstack).toMatchObject({
      instrumented: false,
      count: null,
      statusLabel: NOT_COUNTED_YET,
    });
    expect(byId.vin_decode?.statusLabel).toBe(NOT_COUNTED_YET);
  });

  it("reads optional env limits and ignores junk", () => {
    expect(envMonthlyLimit("mapbox", { FF_API_LIMIT_MAPBOX: "250" })).toBe(250);
    expect(envMonthlyLimit("mapbox", { FF_API_LIMIT_MAPBOX: "nope" })).toBeNull();
    expect(envMonthlyLimit("mapbox", {})).toBeNull();
  });

  it("notifies the sink on a real note without throwing when persist is unavailable", () => {
    const seen: string[] = [];
    setDeveloperApiUsageSink((provider) => {
      seen.push(provider);
    });
    noteDeveloperApiCall("mapbox");
    expect(seen).toEqual(["mapbox"]);
  });

  it("instruments Mapbox, Gemini, FedEx verify, GetParcelData, and FL property after HTTP", () => {
    const mapbox = readFileSync("src/lib/mapbox/client.ts", "utf8");
    const gemini = readFileSync("src/lib/extraction/gemini/client.ts", "utf8");
    const fedex = readFileSync("src/lib/fedex/client.ts", "utf8");
    const gpd = readFileSync("src/lib/getparceldata/client.ts", "utf8");
    const fl = readFileSync("src/lib/florida-property/client.ts", "utf8");
    expect(mapbox).toMatch(/noteDeveloperApiCall\("mapbox"\)/);
    expect(gemini).toMatch(/noteDeveloperApiCall\("gemini"\)/);
    expect(fedex).toMatch(/noteDeveloperApiCall\("fedex"\)/);
    expect(fedex).toMatch(/export async function verifyFedExAddress/);
    expect(gpd).toMatch(/noteDeveloperApiCall\("getparceldata"\)/);
    expect(fl).toMatch(/noteDeveloperApiCall\("florida_property"\)/);
    expect(mapbox.indexOf("await fetchImpl")).toBeLessThan(mapbox.indexOf('noteDeveloperApiCall("mapbox")'));
    expect(gpd.indexOf("await fetchImpl")).toBeLessThan(gpd.indexOf('noteDeveloperApiCall("getparceldata")'));
    const hsMedicare = readFileSync("src/lib/healthsherpa/client.ts", "utf8");
    const hsAca = readFileSync("src/lib/healthsherpa/aca.ts", "utf8");
    expect(hsMedicare).toMatch(/noteDeveloperApiCall\("healthsherpa_medicare"\)/);
    expect(hsAca).toMatch(/noteDeveloperApiCall\("healthsherpa_aca"\)/);
    expect(hsMedicare.indexOf("await fetchImpl")).toBeLessThan(
      hsMedicare.indexOf('noteDeveloperApiCall("healthsherpa_medicare")'),
    );
    expect(hsAca.indexOf("await fetchImpl")).toBeLessThan(hsAca.indexOf('noteDeveloperApiCall("healthsherpa_aca")'));
  });
});
