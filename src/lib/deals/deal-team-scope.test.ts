import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mineScopeForViewer, sameProducerIdentity, type ProducerRef } from "@/lib/auth/producer-identity";
import { sessionSeesAgencyBook, type DeskSession } from "@/lib/auth/session";
import { ADMIN_USER_ID, AGENT_USER_ID, GARCIA_AGENT_USER_ID } from "@/lib/fixtures/ids";
import { matchesDealLens, resolveDealScope, type DealLensCard } from "./deals-lenses";
import { defaultDealsView, type DealsViewId } from "./deals-views";

/** Production agent login. Distinct from the seeded demo Javier row and from Javy Rivera. */
const JAVIER_GARCIA_ID = "75adb983-f43c-47fb-869c-0387ef27314c";

const javy: ProducerRef = {
  id: ADMIN_USER_ID,
  name: "Javy Rivera",
  email: "javy@fitfirst.local",
  role: "admin",
};

const francisco: ProducerRef = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  name: "Francisco Javier Garcia",
  email: "francisco@fitfirst.local",
  role: "agent",
};

const maya: ProducerRef = {
  id: AGENT_USER_ID,
  name: "Maya Chen",
  email: "maya@fitfirst.local",
  role: "agent",
};

const demoJavier: ProducerRef = {
  id: GARCIA_AGENT_USER_ID,
  name: "Javier Garcia",
  email: "javier@fitfirst.local",
  role: "agent",
};

const javier: ProducerRef = {
  id: JAVIER_GARCIA_ID,
  name: "Javier Garcia",
  email: "javier@fitfirst.local",
  role: "agent",
};

const directory = [javy, francisco, maya, demoJavier, javier];

const javyOwned: DealLensCard = { ownerId: ADMIN_USER_ID, heat: "hot", lineOfBusiness: "HO" };
const franciscoOwned: DealLensCard = { ownerId: francisco.id, heat: "hot", lineOfBusiness: "AUTO" };
const mayaOwned: DealLensCard = { ownerId: AGENT_USER_ID, heat: "cooling", lineOfBusiness: "HO" };

function sessionFor(
  person: ProducerRef,
  flags: { isAdmin: boolean; canSeeAgencyWidgets: boolean },
): DeskSession {
  return {
    isAdmin: flags.isAdmin,
    isAgent: !flags.isAdmin,
    userId: person.id,
    name: person.name,
    email: person.email ?? null,
    role: flags.isAdmin ? "admin" : "agent",
    user: { canSeeAgencyWidgets: flags.canSeeAgencyWidgets },
  } as DeskSession;
}

const javierSession = sessionFor(javier, { isAdmin: false, canSeeAgencyWidgets: true });
const mayaSession = sessionFor(maya, { isAdmin: false, canSeeAgencyWidgets: false });
const javySession = sessionFor(javy, { isAdmin: true, canSeeAgencyWidgets: true });

function pipelineView(session: DeskSession, card: DealLensCard, scope?: string | null) {
  const view: DealsViewId = defaultDealsView(session);
  const canSeeTeam = sessionSeesAgencyBook(session);
  const mine = mineScopeForViewer(
    {
      id: session.userId ?? "",
      name: session.name,
      email: session.email,
      role: session.role,
    },
    directory,
  );
  const presented =
    card.ownerId && mine.aliasUserIds.includes(card.ownerId) && session.userId
      ? { ...card, ownerId: session.userId }
      : card;
  const viewScope = resolveDealScope({ scope, canSeeTeam, view });
  return {
    view,
    canSeeTeam,
    viewScope,
    mine,
    visible: matchesDealLens(presented, {
      scope: viewScope,
      viewerId: session.userId,
      viewerIds: mine.ownerIds,
      soloBook: mine.soloBook,
      canSeeTeam,
      view,
    }),
  };
}

describe("Deals pipeline agency-book scope", () => {
  it("wires Team to sessionSeesAgencyBook instead of admin-only", () => {
    const page = readFileSync("src/app/deals/page.tsx", "utf8");
    expect(page).toMatch(/const canSeeTeam = sessionSeesAgencyBook\(session\)/);
    expect(page).not.toMatch(/const canSeeTeam = session\.isAdmin/);
    expect(page).toMatch(/viewerIds: mine\.ownerIds/);
  });

  it("lets Javier with agency widgets default to Team and see Javy-owned deals", () => {
    expect(sameProducerIdentity(javy, javier)).toBe(false);
    expect(sameProducerIdentity(javy, demoJavier)).toBe(false);
    expect(sessionSeesAgencyBook(javierSession)).toBe(true);
    expect(javierSession.isAdmin).toBe(false);

    const open = pipelineView(javierSession, javyOwned);
    expect(open.view).toBe("radar");
    expect(open.canSeeTeam).toBe(true);
    expect(open.viewScope).toBe("team");
    expect(open.visible).toBe(true);
    expect(pipelineView(javierSession, franciscoOwned).visible).toBe(true);
    expect(pipelineView(javierSession, mayaOwned).visible).toBe(true);

    const forcedTeam = pipelineView(javierSession, javyOwned, "team");
    expect(forcedTeam.viewScope).toBe("team");
    expect(forcedTeam.visible).toBe(true);

    const mine = pipelineView(javierSession, javyOwned, "mine");
    expect(mine.viewScope).toBe("mine");
    expect(mine.visible).toBe(false);
    expect(mine.mine.ownerIds).not.toContain(ADMIN_USER_ID);
    expect(mine.mine.ownerIds).toContain(JAVIER_GARCIA_ID);
  });

  it("keeps Maya without the flag on Mine and hides the agency book", () => {
    expect(sessionSeesAgencyBook(mayaSession)).toBe(false);
    const open = pipelineView(mayaSession, javyOwned);
    expect(open.view).toBe("stack");
    expect(open.canSeeTeam).toBe(false);
    expect(open.viewScope).toBe("mine");
    expect(open.visible).toBe(false);
    expect(pipelineView(mayaSession, franciscoOwned).visible).toBe(false);
    expect(pipelineView(mayaSession, mayaOwned).visible).toBe(true);

    const spoofedTeam = pipelineView(mayaSession, javyOwned, "team");
    expect(spoofedTeam.viewScope).toBe("mine");
    expect(spoofedTeam.visible).toBe(false);
  });

  it("leaves Javy on Team and still treats Francisco spellings as his Mine", () => {
    expect(sessionSeesAgencyBook(javySession)).toBe(true);
    expect(sessionSeesAgencyBook(sessionFor(javy, { isAdmin: true, canSeeAgencyWidgets: false }))).toBe(true);

    const open = pipelineView(javySession, javyOwned);
    expect(open.view).toBe("radar");
    expect(open.canSeeTeam).toBe(true);
    expect(open.viewScope).toBe("team");
    expect(open.visible).toBe(true);
    expect(pipelineView(javySession, franciscoOwned).visible).toBe(true);
    expect(pipelineView(javySession, mayaOwned).visible).toBe(true);

    const mineFrancisco = pipelineView(javySession, franciscoOwned, "mine");
    expect(mineFrancisco.viewScope).toBe("mine");
    expect(mineFrancisco.visible).toBe(true);
    expect(mineFrancisco.mine.ownerIds).toEqual(expect.arrayContaining([ADMIN_USER_ID, francisco.id]));
    expect(mineFrancisco.mine.ownerIds).not.toContain(JAVIER_GARCIA_ID);
    expect(mineFrancisco.mine.ownerIds).not.toContain(GARCIA_AGENT_USER_ID);
    expect(pipelineView(javySession, mayaOwned, "mine").visible).toBe(false);
    expect(pipelineView(javySession, { ...javyOwned, ownerId: JAVIER_GARCIA_ID }, "mine").visible).toBe(false);
    expect(pipelineView(javySession, { ...javyOwned, ownerId: GARCIA_AGENT_USER_ID }, "mine").visible).toBe(false);
  });
});
