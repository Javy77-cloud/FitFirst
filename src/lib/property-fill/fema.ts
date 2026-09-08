import type { PropertyRecordsFact } from "@/lib/getparceldata/map";
import { attrString, epochToIsoDate, queryArcgis, type ArcgisAttrs } from "./arcgis";
import { FEMA_LABEL } from "./types";

const NFHL_ZONES =
  "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query";
const NFHL_PANELS =
  "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/3/query";

type FetchLike = typeof fetch;

function push(facts: PropertyRecordsFact[], sheetKey: string, value: string) {
  if (!value) return;
  facts.push({
    fieldKey: sheetKey,
    sheetKey,
    value,
    sourceLabel: FEMA_LABEL,
    kind: "fema",
  });
}

function validBfe(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= -9990 || n >= 9990) return "";
  return String(n);
}

export async function factsFromFemaNfhl(
  lat: number,
  lng: number,
  fetchImpl: FetchLike = fetch,
): Promise<PropertyRecordsFact[]> {
  const geometry = JSON.stringify({
    x: lng,
    y: lat,
    spatialReference: { wkid: 4326 },
  });
  const base = {
    geometry,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "false",
    f: "json",
  };

  const [zones, panels] = await Promise.all([
    queryArcgis(NFHL_ZONES, { ...base, outFields: "FLD_ZONE,SFHA_TF,STATIC_BFE,ZONE_SUBTY" }, fetchImpl),
    queryArcgis(NFHL_PANELS, { ...base, outFields: "FIRM_PAN,EFF_DATE,PANEL" }, fetchImpl),
  ]);

  const zoneAttrs: ArcgisAttrs = zones[0]?.attributes ?? {};
  const panelAttrs: ArcgisAttrs = panels[0]?.attributes ?? {};
  const facts: PropertyRecordsFact[] = [];

  const zone = attrString(zoneAttrs, ["FLD_ZONE"]);
  push(facts, "flood_zone", zone);

  const bfe = validBfe(attrString(zoneAttrs, ["STATIC_BFE"]));
  push(facts, "bfe", bfe);

  const subtype = attrString(zoneAttrs, ["ZONE_SUBTY"]);
  if (subtype && zone) {
    // Keep subtype discoverable in records_check-friendly flood_zone only when zone alone is thin
  }

  const panel = attrString(panelAttrs, ["FIRM_PAN", "PANEL"]);
  push(facts, "firm_panel", panel);

  const eff = attrString(panelAttrs, ["EFF_DATE"]);
  push(facts, "firm_effective_date", eff ? epochToIsoDate(eff) : "");

  return facts;
}
