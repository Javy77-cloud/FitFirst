import { AGENCY_BRAND, defaultColumnLayout } from "@/lib/domain";
import { db } from "./index";
import { agencyBrand, agentUiPrefs, emailSignatures } from "./schema";
import { AGENCY_BRAND_ID, AGENT_PREF_IDS, EMAIL_SIGNATURE_ID, TENANT_ID } from "../fixtures/ids";

const SIGNATURE_EN = `Javier
${AGENCY_BRAND.name}
${AGENCY_BRAND.phone}

— Example signature. Edit this for your voice. —`;

const SIGNATURE_ES = `Javier
${AGENCY_BRAND.name}
${AGENCY_BRAND.phone}

— Firma de ejemplo. Edítala con tu voz. —`;

export async function seedAgencyBrand() {
  await db
    .insert(agencyBrand)
    .values({
      id: AGENCY_BRAND_ID,
      tenantId: TENANT_ID,
      agencyName: AGENCY_BRAND.name,
      defaultColorPreset: "agency",
      defaultFontPreset: "plex",
      defaultDensity: "comfortable",
      defaultColumnLayout: defaultColumnLayout(),
    })
    .onConflictDoNothing({ target: agencyBrand.id });

  await db
    .insert(emailSignatures)
    .values({
      id: EMAIL_SIGNATURE_ID,
      tenantId: TENANT_ID,
      name: "Agency default",
      bodyEn: SIGNATURE_EN,
      bodyEs: SIGNATURE_ES,
      isDefault: true,
      isExampleCopy: true,
    })
    .onConflictDoNothing({ target: emailSignatures.id });

  await db
    .insert(agentUiPrefs)
    .values([
      {
        id: AGENT_PREF_IDS.admin,
        tenantId: TENANT_ID,
        actorKey: "admin",
        colorPreset: null,
        fontPreset: null,
        density: null,
        columnLayout: null,
      },
      {
        id: AGENT_PREF_IDS.agent,
        tenantId: TENANT_ID,
        actorKey: "agent",
        colorPreset: null,
        fontPreset: null,
        density: null,
        columnLayout: null,
      },
    ])
    .onConflictDoNothing({ target: agentUiPrefs.id });
}
