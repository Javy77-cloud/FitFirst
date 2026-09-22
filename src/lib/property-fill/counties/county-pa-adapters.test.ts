import { describe, expect, it, vi } from "vitest";
import { resolveCountyPaAdapter, wiredCountyIds } from "./registry";
import { factsFromMiamiDadeCountyPa, miamiDadeMatches } from "./miami-dade";
import { factsFromPalmBeachCountyPa, palmBeachMatches } from "./palm-beach";
import { factsFromPinellasCountyPa, pinellasMatches } from "./pinellas";
import { factsFromDuvalCountyPa, duvalMatches } from "./duval";
import { factsFromSarasotaCountyPa, sarasotaMatches } from "./sarasota";
import { factsFromCollierCountyPa, collierMatches } from "./collier";
import { factsFromManateeCountyPa, manateeMatches } from "./manatee";
import { factsFromPascoCountyPa, pascoMatches } from "./pasco";
import { factsFromPolkCountyPa, polkMatches } from "./polk";
import { factsFromBrevardCountyPa, brevardMatches } from "./brevard";
import { factsFromVolusiaCountyPa, volusiaMatches } from "./volusia";
import { streetSearchToken } from "./helpers";

function mockArcgis(attributes: Record<string, unknown>) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ features: [{ attributes }] }),
  })) as unknown as typeof fetch;
}

describe("county PA registry wiring", () => {
  it("resolves each new county id and rejects Broward / non-FL", () => {
    expect(resolveCountyPaAdapter({ county: "Miami-Dade", state: "FL" })?.id).toBe("miami-dade");
    expect(resolveCountyPaAdapter({ county: "Palm Beach", state: "FL" })?.id).toBe("palm-beach");
    expect(resolveCountyPaAdapter({ county: "Pinellas", state: "FL" })?.id).toBe("pinellas");
    expect(resolveCountyPaAdapter({ county: "Jacksonville", state: "FL" })?.id).toBe("duval");
    expect(resolveCountyPaAdapter({ county: "Sarasota", state: "FL" })?.id).toBe("sarasota");
    expect(resolveCountyPaAdapter({ county: "Collier", state: "FL" })?.id).toBe("collier");
    expect(resolveCountyPaAdapter({ county: "Manatee", state: "FL" })?.id).toBe("manatee");
    expect(resolveCountyPaAdapter({ county: "Pasco", state: "FL" })?.id).toBe("pasco");
    expect(resolveCountyPaAdapter({ county: "Polk", state: "FL" })?.id).toBe("polk");
    expect(resolveCountyPaAdapter({ county: "Brevard", state: "FL" })?.id).toBe("brevard");
    expect(resolveCountyPaAdapter({ county: "Volusia", state: "FL" })?.id).toBe("volusia");
    expect(resolveCountyPaAdapter({ county: "Broward", state: "FL" })).toBeNull();
    expect(resolveCountyPaAdapter({ county: "Miami-Dade", state: "OH" })).toBeNull();
    expect(wiredCountyIds()).toEqual(
      expect.arrayContaining(["lee", "hillsborough", "orange", "miami-dade", "volusia"]),
    );
  });

  it("picks a street token that works for split-field layers", () => {
    expect(streetSearchToken("US HIGHWAY 98 N")).toBe("98");
    expect(streetSearchToken("S SHORE DR")).toBe("SHORE");
    expect(streetSearchToken("VANDERBILT DR")).toBe("VANDERBILT");
  });
});

describe("Miami-Dade PA adapter", () => {
  it("matches Miami-Dade aliases only in FL", () => {
    expect(miamiDadeMatches("Miami-Dade", "FL")).toBe(true);
    expect(miamiDadeMatches("Dade", "Florida")).toBe(true);
    expect(miamiDadeMatches("Miami-Dade", "TX")).toBe(false);
  });

  it("maps heated area, year built, and baths from ArcGIS attrs", async () => {
    const facts = await factsFromMiamiDadeCountyPa(
      { address1: "1100 Biscayne Blvd", city: "Miami", state: "FL", county: "Miami-Dade" },
      mockArcgis({
        FOLIO: "0131360760010",
        TRUE_SITE_ADDR: "1100 BISCAYNE BLVD",
        TRUE_OWNER1: "1100 BISCAYNE PROPCO LLC",
        YEAR_BUILT: 2009,
        BEDROOM_COUNT: 3,
        BATHROOM_COUNT: 2,
        HALF_BATHROOM_COUNT: 1,
        FLOOR_COUNT: 2,
        UNIT_COUNT: 1,
        BUILDING_HEATED_AREA: 1840,
        TOTAL_VAL_CUR: 425000,
        LAND_VAL_CUR: 180000,
        BUILDING_VAL_CUR: 245000,
        DOR_DESC: "SINGLE FAMILY",
        PRIMARY_ZONE: "6401",
        SUBDIVISION: "DOWNTOWN",
        ASSESSMENT_YEAR_CUR: 2026,
      }),
    );
    expect(facts.find((f) => f.sheetKey === "year_built")?.value).toBe("2009");
    expect(facts.find((f) => f.sheetKey === "square_feet")?.value).toBe("1840");
    expect(facts.find((f) => f.sheetKey === "baths")?.value).toBe("2.5");
    expect(facts.find((f) => f.sheetKey === "improvement_value")?.value).toBe("245000");
    expect(facts.every((f) => f.sourceLabel === "county PA")).toBe(true);
    expect(facts.some((f) => f.sheetKey === "coverage_a")).toBe(false);
  });
});

describe("Palm Beach PA adapter", () => {
  it("matches Palm Beach in FL", () => {
    expect(palmBeachMatches("Palm Beach", "FL")).toBe(true);
    expect(palmBeachMatches("PalmBeach", "FL")).toBe(true);
  });

  it("maps year built, values, and sale year from ArcGIS attrs", async () => {
    const facts = await factsFromPalmBeachCountyPa(
      { address1: "1411 SW 19th St", city: "Boca Raton", state: "FL", county: "Palm Beach" },
      mockArcgis({
        PARID: "06424736010470301",
        SITE_ADDR_STR: "1411 SW 19TH ST",
        OWNER_NAME1: "JOVKOVIC DJORDJE &",
        YRBLT: "1986",
        ASSESSED_VAL: 935131,
        ACRES: 0.21,
        PRICE: 1300000,
        SALE_DATE: 1738886400000,
        LAND_MARKET: 609845,
        IMPRV_MRKT: 325286,
        PROPERTY_USE: "SINGLE FAMILY",
        HMSTD_FLG: "Y",
        SUBDIV_NAME: "PALM BEACH FARMS",
      }),
    );
    expect(facts.find((f) => f.sheetKey === "year_built")?.value).toBe("1986");
    expect(facts.find((f) => f.sheetKey === "sale_price")?.value).toBe("1300000");
    expect(facts.find((f) => f.sheetKey === "year_purchased")?.value).toBe("2025");
    expect(facts.find((f) => f.sheetKey === "homestead")?.value).toBe("yes");
    expect(facts.find((f) => f.sheetKey === "acres")?.value).toBe("0.21");
  });
});

describe("Pinellas PA adapter", () => {
  it("matches Pinellas in FL", () => {
    expect(pinellasMatches("Pinellas", "FL")).toBe(true);
  });

  it("maps values and homestead from ArcGIS attrs", async () => {
    const facts = await factsFromPinellasCountyPa(
      { address1: "7125 S Shore Dr", city: "South Pasadena", state: "FL", county: "Pinellas" },
      mockArcgis({
        PARCELID: "313116676080040070",
        SITE_ADDRESS: "7125 S SHORE DR",
        OWNER1: "FOUNDATION REALTY LLC",
        LAND_VALUE: 217404,
        IMP_VALUE: 70455,
        TAXABLE_VALUE: 287859,
        Acres: 0.18,
        HOMESTEAD: "No",
        SALEPRICE1: 250000,
        SALEDATE1: 1609459200000,
        USE_CODE: "0110",
        FIRE_DISTRICT: "SOUTH PASADENA",
      }),
    );
    expect(facts.find((f) => f.sheetKey === "improvement_value")?.value).toBe("70455");
    expect(facts.find((f) => f.sheetKey === "homestead")?.value).toBe("no");
    expect(facts.find((f) => f.sheetKey === "acres")?.value).toBe("0.18");
    expect(facts.find((f) => f.sheetKey === "year_purchased")?.value).toBe("2021");
  });
});

describe("Duval PA adapter", () => {
  it("matches Duval and Jacksonville in FL", () => {
    expect(duvalMatches("Duval", "FL")).toBe(true);
    expect(duvalMatches("Jacksonville", "FL")).toBe(true);
  });

  it("maps RE, values, and land use from ArcGIS attrs", async () => {
    const facts = await factsFromDuvalCountyPa(
      { address1: "100 W Forsyth St", city: "Jacksonville", state: "FL", county: "Duval" },
      mockArcgis({
        RE: "073456 0015",
        LNAMEOWNER: "WW PROPERTIES LLC",
        STREET_NO: "100",
        ST_NAME: "FORSYTH",
        ACRES: 0.215,
        TOT_LND_VA: 250360,
        TOT_BLD_VA: 190984,
        CAMA_VAL: 600000,
        DESCPU: "Shopping Ctr/Nbhd",
        SALESLYY: 2019,
      }),
    );
    expect(facts.find((f) => f.sheetKey === "parcel_id")?.value).toBe("073456 0015");
    expect(facts.find((f) => f.sheetKey === "assessed_value")?.value).toBe("600000");
    expect(facts.find((f) => f.sheetKey === "land_use")?.value).toBe("Shopping Ctr/Nbhd");
    expect(facts.find((f) => f.sheetKey === "year_purchased")?.value).toBe("2019");
  });
});

describe("Sarasota PA adapter", () => {
  it("matches Sarasota in FL", () => {
    expect(sarasotaMatches("Sarasota", "FL")).toBe(true);
  });

  it("maps dwelling fields and skips year_built 0", async () => {
    const facts = await factsFromSarasotaCountyPa(
      { address1: "2244 Harbour Court Dr", city: "Longboat Key", state: "FL", county: "Sarasota" },
      mockArcgis({
        ACCOUNT: "0007080010",
        FULLADDRESS: "2244 HARBOUR COURT DR LONGBOAT KEY FL, 34228",
        NAME1: "WOOD ELWOOD S",
        YRBL: 1987,
        LIVING: 2983,
        BEDR: 3,
        BATH: 3,
        POOL: "Y",
        JUST: 1662500,
        ASSD: 1662500,
        IMPROVEMT: 559600,
        SALE_AMT: 514800,
        SALE_DATE: 565333200000,
        ZONING: "PD",
        MeasuredAcreage: 0.1453,
      }),
    );
    expect(facts.find((f) => f.sheetKey === "year_built")?.value).toBe("1987");
    expect(facts.find((f) => f.sheetKey === "square_feet")?.value).toBe("2983");
    expect(facts.find((f) => f.sheetKey === "beds")?.value).toBe("3");
    expect(facts.find((f) => f.sheetKey === "pool")?.value).toBe("yes");
    expect(facts.find((f) => f.sheetKey === "improvement_value")?.value).toBe("559600");
  });
});

describe("Collier PA adapter", () => {
  it("matches Collier in FL", () => {
    expect(collierMatches("Collier", "FL")).toBe(true);
  });

  it("maps folio, values, and homestead exemption amount", async () => {
    const facts = await factsFromCollierCountyPa(
      { address1: "13105 Vanderbilt Dr", city: "Naples", state: "FL", county: "Collier" },
      mockArcgis({
        Folio: "59620000949",
        OwnerLine1: "BROOCK, BOWEN R=& JOY D",
        SiteStreetAddress: "13105 VANDERBILT DR",
        TotalAcres: 0.25,
        LandJustValue: 400000,
        ImprovementsJustValue: 1068750,
        TotalJustValue: 1468750,
        CountyAssessedValue: 1064708,
        HmstdExemptAmount: 25000,
        TaxYear: 2026,
      }),
    );
    expect(facts.find((f) => f.sheetKey === "parcel_id")?.value).toBe("59620000949");
    expect(facts.find((f) => f.sheetKey === "improvement_value")?.value).toBe("1068750");
    expect(facts.find((f) => f.sheetKey === "homestead")?.value).toBe("yes");
    expect(facts.find((f) => f.sheetKey === "assessment_year")?.value).toBe("2026");
  });
});

describe("Manatee PA adapter", () => {
  it("matches Manatee in FL", () => {
    expect(manateeMatches("Manatee", "FL")).toBe(true);
  });

  it("maps CAMA dwelling fields including garage bays and pool", async () => {
    const facts = await factsFromManateeCountyPa(
      { address1: "8306 High Oaks Trl", city: "Sarasota", state: "FL", county: "Manatee" },
      mockArcgis({
        PARID: "165630229",
        SITUS_ADDRESS: "8306 HIGH OAKS TRL",
        PAR_OWNER_NAME1: "MILEN, ANTHONY A",
        BLDG_R1_YRBUILT: 2023,
        BLDG_R1_SQFTLIVNG: 2650,
        BLDG_R1_BEDRMS: 3,
        BLDG_R1_FBATHS: 3,
        BLDG_R1_HBATHS: 0,
        BLDG_R1_STORIES: 1,
        BLDGS_GARAGE_BAYS: 4,
        BLDGS_LIVINGUNITS: 1,
        CAD_JUST_VALUE: 1251408,
        CAD_JUST_LNDVAL: 272340,
        CAD_JUST_IMPVAL: 979068,
        PAR_SWIMPOOL_FLAG: "Y",
        PAR_ZONING: "A",
        LAND_ACREAGE_CAMA: 9.56,
        SALE_DATE_LAST: 1619064000000,
        CAD_EXEM_HOM_FLAG: "Y",
        CAD_ROLL_YEAR: 2026,
        BLDG_R1_EXTWALL: "STUCCO",
      }),
    );
    expect(facts.find((f) => f.sheetKey === "year_built")?.value).toBe("2023");
    expect(facts.find((f) => f.sheetKey === "square_feet")?.value).toBe("2650");
    expect(facts.find((f) => f.sheetKey === "garage_spaces")?.value).toBe("4");
    expect(facts.find((f) => f.sheetKey === "garage_type")).toBeUndefined();
    expect(facts.find((f) => f.sheetKey === "pool")?.value).toBe("yes");
    expect(facts.find((f) => f.sheetKey === "exterior")?.value).toBe("STUCCO");
    expect(facts.find((f) => f.sheetKey === "year_purchased")?.value).toBe("2021");
  });
});

describe("Pasco PA adapter", () => {
  it("matches Pasco in FL", () => {
    expect(pascoMatches("Pasco", "FL")).toBe(true);
  });

  it("maps values, sale year, and homestead from ArcGIS attrs", async () => {
    const facts = await factsFromPascoCountyPa(
      { address1: "16437 Mainsail Drive", city: "Wimauma", state: "FL", county: "Pasco" },
      mockArcgis({
        ParcelID: "14-24-16-004A-00000-2390",
        PHYS_STREET: "16437 MAINSAIL DRIVE",
        NAD_NAME_1: "PRACK JAMES PHILIP JR",
        VAL_ACRES: 0.17,
        VAL_LAND: 18630,
        VAL_BLDG_DEPR: 226128,
        VAL_APPR: 245694,
        SALE_YEAR: 2020,
        SALE_AMT: 295000,
        HAS_HX: "Yes",
      }),
    );
    expect(facts.find((f) => f.sheetKey === "assessed_value")?.value).toBe("245694");
    expect(facts.find((f) => f.sheetKey === "year_purchased")?.value).toBe("2020");
    expect(facts.find((f) => f.sheetKey === "homestead")?.value).toBe("yes");
  });
});

describe("Polk PA adapter", () => {
  it("matches Polk in FL", () => {
    expect(polkMatches("Polk", "FL")).toBe(true);
  });

  it("maps year improved and split-address parcel attrs", async () => {
    const facts = await factsFromPolkCountyPa(
      { address1: "13961 US Highway 98 N", city: "Kathleen", state: "FL", county: "Polk" },
      mockArcgis({
        PARCELID: "222601000000011000",
        PROP_ADRNO: 13961,
        PROP_ADRSTR: "HWY 98",
        NAME: "OVERSTREET MARK F",
        YR_IMPROVED: 1941,
        TOT_LND_VAL: 1018244,
        TOT_BLD_VAL: 1532952,
        ASSESSVAL: 1667243,
        TOT_ACREAGE: 248.3522,
        HMSTD: "Y",
        DOR_USE_CODE_DESC: "Pasture w/Res.",
      }),
    );
    expect(facts.find((f) => f.sheetKey === "year_built")?.value).toBe("1941");
    expect(facts.find((f) => f.sheetKey === "land_use")?.value).toBe("Pasture w/Res.");
    expect(facts.find((f) => f.sheetKey === "homestead")?.value).toBe("yes");
  });
});

describe("Brevard PA adapter", () => {
  it("matches Brevard in FL", () => {
    expect(brevardMatches("Brevard", "FL")).toBe(true);
  });

  it("maps living area and values from county GIS Parcel Property", async () => {
    const facts = await factsFromBrevardCountyPa(
      { address1: "3360 Main St", city: "Mims", state: "FL", county: "Brevard" },
      mockArcgis({
        PARCEL_ID: "21 3517-50-*-8",
        STREET_NUMBER: "3360",
        STREET_NAME: "MAIN",
        OWNER_NAME1: "WILSON, WILLIAM L",
        LIV_AREA: 1448,
        BLDG_VALUE: 154120,
        LAND_VALUE: 49020,
        ACRES: 1.29,
        USE_CODE_DESCRIPTION: "SINGLE FAMILY RESIDENCE",
        HOMESTEAD_VALUE: 50000,
        SUBDIVISION_NAME: "MIMS",
      }),
    );
    expect(facts.find((f) => f.sheetKey === "square_feet")?.value).toBe("1448");
    expect(facts.find((f) => f.sheetKey === "improvement_value")?.value).toBe("154120");
    expect(facts.find((f) => f.sheetKey === "homestead")?.value).toBe("yes");
    expect(facts.find((f) => f.sheetKey === "land_use")?.value).toBe("SINGLE FAMILY RESIDENCE");
  });
});

describe("Volusia PA adapter", () => {
  it("matches Volusia in FL", () => {
    expect(volusiaMatches("Volusia", "FL")).toBe(true);
  });

  it("maps CAMA beds/baths/sqft from Parcel Ownership", async () => {
    const facts = await factsFromVolusiaCountyPa(
      { address1: "291 Main St", city: "DeLand", state: "FL", county: "Volusia" },
      mockArcgis({
        PID: "581400000011",
        ADDRFULL: "291 MAIN ST",
        ADRNO: 291,
        ADRSTR: "MAIN",
        OWNER1: "BEEDE PHILLIP",
        RES_BEDROOM: 3,
        RES_BATHROOM: 2,
        RES_TOTAL_SFLA: 1248,
        RES_MAX_STORIES: 1,
        TOTJUST: 192226,
        LANDJUST: 97500,
        IMPRJUST: 94726,
        CALCACRES: 5,
        LASTSALEPRICE: 92500,
        LASTSALEDT: 1615867200000,
        HXFLAG: "Y",
      }),
    );
    expect(facts.find((f) => f.sheetKey === "beds")?.value).toBe("3");
    expect(facts.find((f) => f.sheetKey === "square_feet")?.value).toBe("1248");
    expect(facts.find((f) => f.sheetKey === "year_purchased")?.value).toBe("2021");
    expect(facts.find((f) => f.sheetKey === "homestead")?.value).toBe("yes");
  });
});
