import { searchGetParcelDataRecords } from "../src/lib/getparceldata/client";

async function run(label: string, address: any) {
  const key = process.env.GETPARCELDATA_API_KEY;
  const result = await searchGetParcelDataRecords(address, key);
  console.log("\n====", label, result.status, result.message);
  console.log("called", result.called, "lat", result.lat, "lng", result.lng);
  if (result.hit) {
    const h = result.hit as any;
    const keys = [
      "parcel_id","apn","year_built","building_area","bedrooms","bathrooms","stories",
      "number_of_units","assessed_value","land_value","improvement_value","assessment_year",
      "zoning","legal_description","subdivision_name","flood_zone","homestead","sale_price",
      "sale_date","owner_name","property_address_line1","property_city","property_zip","county_geoid",
      "acreage","land_use","construction_type","exterior","foundation","roof_type","pool"
    ];
    for (const k of keys) console.log(`  ${k}=${JSON.stringify(h[k] ?? null)}`);
  }
  console.log("facts", result.facts.map((f) => `${f.sheetKey}=${f.value}`).join(" | "));
}

async function main() {
  await run("DP3 Miami-Dade", {
    address1: "10358 NW 30th TER",
    city: "Doral",
    state: "FL",
    zip: "33172",
    county: "MIAMI-DADE",
  });
  await run("HO3 Osceola", {
    address1: "8944 Adriatico LN",
    city: "Kissimmee",
    state: "FL",
    zip: "34747",
    county: "OSCEOLA",
  });
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
