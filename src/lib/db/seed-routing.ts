import {
  ADMIN_USER_ID,
  AGENT_USER_ID,
  LEAD_ROUTING_RULE_IDS,
  ROUTED_LEAD_TESSA_ID,
  TENANT_ID,
  TERRITORY_SPACE_COAST_ID,
  UNASSIGNED_LEAD_GRANT_ID,
  USER_TERRITORY_MAYA_SPACE_COAST_ID,
} from "../fixtures/ids";
import { applyLeadRouting } from "../leads/apply-routing";
import { db } from "./index";
import { leadRoutingRules, leads, userTerritories } from "./schema";

/**
 * Space Coast HO/Auto → Maya when she has capacity. FL GL → Javy.
 * Tessa (Melbourne HO) routes. Grant (Billings MT Auto) misses → lead-offer board.
 * Ana is not touched.
 */
export async function seedLeadRoutingAndRenewalRisk() {
  await db
    .insert(userTerritories)
    .values({
      id: USER_TERRITORY_MAYA_SPACE_COAST_ID,
      tenantId: TENANT_ID,
      userId: AGENT_USER_ID,
      territoryId: TERRITORY_SPACE_COAST_ID,
    })
    .onConflictDoUpdate({
      target: userTerritories.id,
      set: {
        userId: AGENT_USER_ID,
        territoryId: TERRITORY_SPACE_COAST_ID,
        updatedAt: new Date(),
      },
    });

  const rules = [
    {
      id: LEAD_ROUTING_RULE_IDS.spaceCoastHo,
      name: "Space Coast Home",
      sortOrder: 10,
      territoryId: TERRITORY_SPACE_COAST_ID,
      writtenLine: "HO",
      maxOpenDeals: 12,
      producerId: AGENT_USER_ID,
    },
    {
      id: LEAD_ROUTING_RULE_IDS.spaceCoastAuto,
      name: "Space Coast Auto",
      sortOrder: 20,
      territoryId: TERRITORY_SPACE_COAST_ID,
      writtenLine: "AUTO",
      maxOpenDeals: 8,
      producerId: AGENT_USER_ID,
    },
    {
      id: LEAD_ROUTING_RULE_IDS.flGl,
      name: "Florida GL",
      sortOrder: 30,
      territoryId: null,
      writtenLine: "GL",
      maxOpenDeals: 20,
      producerId: ADMIN_USER_ID,
    },
  ];

  for (const rule of rules) {
    await db
      .insert(leadRoutingRules)
      .values({
        id: rule.id,
        tenantId: TENANT_ID,
        name: rule.name,
        enabled: true,
        sortOrder: rule.sortOrder,
        territoryId: rule.territoryId,
        writtenLine: rule.writtenLine,
        maxOpenDeals: rule.maxOpenDeals,
        producerId: rule.producerId,
      })
      .onConflictDoUpdate({
        target: leadRoutingRules.id,
        set: {
          name: rule.name,
          enabled: true,
          sortOrder: rule.sortOrder,
          territoryId: rule.territoryId,
          writtenLine: rule.writtenLine,
          maxOpenDeals: rule.maxOpenDeals,
          producerId: rule.producerId,
          updatedAt: new Date(),
        },
      });
  }

  await db
    .insert(leads)
    .values({
      id: ROUTED_LEAD_TESSA_ID,
      tenantId: TENANT_ID,
      ownerId: null,
      firstName: "Tessa",
      lastName: "Voss",
      email: "tessa.voss@inbox.local",
      phone: "3215550188",
      city: "Melbourne",
      state: "FL",
      zip: "32901",
      insuranceTypeDesired: "HO",
      source: "inbound_email",
      status: "new",
      notes: "Space Coast HO inbound. Auto-route should land on Maya.",
    })
    .onConflictDoUpdate({
      target: leads.id,
      set: {
        ownerId: null,
        city: "Melbourne",
        state: "FL",
        insuranceTypeDesired: "HO",
        source: "inbound_email",
        notes: "Space Coast HO inbound. Auto-route should land on Maya.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(leads)
    .values({
      id: UNASSIGNED_LEAD_GRANT_ID,
      tenantId: TENANT_ID,
      ownerId: null,
      firstName: "Grant",
      lastName: "Hobbs",
      email: "grant.hobbs@inbox.local",
      phone: "4065550144",
      city: "Billings",
      state: "MT",
      zip: "59101",
      insuranceTypeDesired: "AUTO",
      source: "inbound_email",
      status: "new",
      notes: "Montana Auto. No Space Coast / FL rule — stays on the lead-offer board.",
    })
    .onConflictDoUpdate({
      target: leads.id,
      set: {
        ownerId: null,
        city: "Billings",
        state: "MT",
        insuranceTypeDesired: "AUTO",
        source: "inbound_email",
        notes: "Montana Auto. No Space Coast / FL rule — stays on the lead-offer board.",
        updatedAt: new Date(),
      },
    });

  await applyLeadRouting(ROUTED_LEAD_TESSA_ID);
  await applyLeadRouting(UNASSIGNED_LEAD_GRANT_ID);
}
