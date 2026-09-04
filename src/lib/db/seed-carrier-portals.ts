import { and, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { carriers } from "./schema";
import { writePortalPassword, writePortalUsername } from "@/lib/carriers/secrets";
import { CARRIER_IDS, PORTAL_DEMO_CARRIER_IDS, TENANT_ID } from "../fixtures/ids";

type PortalDemoSeed = {
  id: string;
  name: string;
  naic: string;
  agencyCode: string;
  portalUrl: string;
  portalLogin: string;
  website: string;
  agentPortalUrl: string;
  username: string;
  password: string;
  carrierInfo: string;
};

export const PORTAL_DEMO_SEEDS: PortalDemoSeed[] = [
  {
    id: PORTAL_DEMO_CARRIER_IDS.americanTraditions,
    name: "American Traditions",
    naic: "12359",
    agencyCode: "FF-AT-1048",
    portalUrl: "https://agents.amtraditions.example/login",
    portalLogin: "AT agent",
    website: "https://www.amtraditions.example",
    agentPortalUrl: "https://agents.amtraditions.example",
    username: "fitfirst.at.demo",
    password: "AT-portal-demo-2026",
    carrierInfo: "Demo quoting portal. Encrypted desk login for later Chrome Fill handoff — not a live rater.",
  },
  {
    id: PORTAL_DEMO_CARRIER_IDS.peoplesTrust,
    name: "People's Trust",
    naic: "13125",
    agencyCode: "FF-PT-2201",
    portalUrl: "https://agents.peoplestrust.example/login",
    portalLogin: "PT agent",
    website: "https://www.peoplestrust.example",
    agentPortalUrl: "https://agents.peoplestrust.example",
    username: "fitfirst.pt.demo",
    password: "PT-portal-demo-2026",
    carrierInfo: "Demo quoting portal. Encrypted desk login for later Chrome Fill handoff — not a live rater.",
  },
];

export async function seedCarrierPortals() {
  for (const demo of PORTAL_DEMO_SEEDS) {
    const user = writePortalUsername(demo.username);
    const pass = writePortalPassword(demo.password);
    const now = new Date();
    const [existing] = await db
      .select({ id: carriers.id })
      .from(carriers)
      .where(and(eq(carriers.tenantId, TENANT_ID), sql`lower(${carriers.name}) = ${demo.name.toLowerCase()}`));
    const id = existing?.id ?? demo.id;
    const values = {
      name: demo.name,
      naic: demo.naic,
      portalUrl: demo.portalUrl,
      portalLogin: demo.portalLogin,
      agencyCode: demo.agencyCode,
      website: demo.website,
      agentPortalUrl: demo.agentPortalUrl,
      carrierInfo: demo.carrierInfo,
      amBestRating: "A-",
      territory: "Florida",
      preferredSubmission: "portal",
      bindingAuthority: "limited",
      ...user,
      ...pass,
      portalSecretsUpdatedAt: now,
      updatedAt: now,
    };

    if (existing) {
      await db.update(carriers).set(values).where(eq(carriers.id, existing.id));
      continue;
    }

    await db.insert(carriers).values({
      id,
      tenantId: TENANT_ID,
      writtenLines: ["HO"],
      dontWriteNotes: "Portal-credential demo. Not an Ana Dib shop market.",
      portalStatus: "open",
      appetiteNotes: "Demo appointment for portal login storage. Filter-first still uses the Ana shop book.",
      fixtureTag: "portal-creds-demo",
      active: true,
      ...values,
    });
  }

  await db
    .update(carriers)
    .set({
      agencyCode: "FC-HAR-1006",
      portalUrl: "https://harmony.tailrow.com",
      updatedAt: new Date(),
    })
    .where(eq(carriers.id, CARRIER_IDS.tailrow));

  await db
    .update(carriers)
    .set({
      agencyCode: "AFA-AIC-12841",
      portalUrl: "https://agents.aiicfl.com",
      updatedAt: new Date(),
    })
    .where(eq(carriers.id, CARRIER_IDS.americanIntegrity));
}
