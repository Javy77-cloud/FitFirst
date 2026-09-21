import { describe, expect, it } from "vitest";
import { ADMIN_USER_ID, AGENT_USER_ID, GARCIA_AGENT_USER_ID } from "@/lib/fixtures/ids";
import {
  aliasOwnerIds,
  canonicalProducerId,
  isSoloProducerBook,
  mineOwnerIds,
  mineScopeForViewer,
  ownerIdForWrite,
  ownerMatchesMine,
  resolveDirectoryOwnerId,
  sameProducerIdentity,
} from "./producer-identity";

const javy = {
  id: ADMIN_USER_ID,
  name: "Javy Rivera",
  email: "javy@fitfirst.local",
  role: "admin",
  active: true,
  accessStatus: "active",
};

const francisco = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  name: "Francisco Javier Garcia",
  email: "francisco@fitfirst.local",
  role: "agent",
  active: true,
  accessStatus: "active",
};

const maya = {
  id: AGENT_USER_ID,
  name: "Maya Chen",
  email: "maya@fitfirst.local",
  role: "agent",
  active: true,
  accessStatus: "active",
};

const demoJavier = {
  id: GARCIA_AGENT_USER_ID,
  name: "Javier Garcia",
  email: "javier@fitfirst.local",
  role: "agent",
  active: true,
  accessStatus: "active",
};

describe("producer identity — Javy vs Francisco phantom agent", () => {
  it("treats Javy Rivera and Francisco Javier Garcia as the same person", () => {
    expect(sameProducerIdentity(javy, francisco)).toBe(true);
    expect(sameProducerIdentity(francisco, javy)).toBe(true);
    expect(sameProducerIdentity(javy, { ...javy, name: "Francisco Javier Garcia Rivera" })).toBe(true);
  });

  it("does not collapse demo Javier Garcia or Maya into Javy", () => {
    expect(sameProducerIdentity(javy, demoJavier)).toBe(false);
    expect(sameProducerIdentity(javy, maya)).toBe(false);
    expect(sameProducerIdentity(francisco, maya)).toBe(false);
  });

  it("puts Francisco-owned deals on Javy Mine and keeps Maya off Mine", () => {
    const directory = [javy, francisco, maya, demoJavier];
    const mine = mineScopeForViewer(javy, directory);
    expect(mine.ownerIds).toEqual(expect.arrayContaining([ADMIN_USER_ID, francisco.id]));
    expect(mine.aliasUserIds).toEqual([francisco.id]);
    expect(mine.soloBook).toBe(false);
    expect(ownerMatchesMine(francisco.id, { viewerId: javy.id, viewerIds: mine.ownerIds })).toBe(true);
    expect(ownerMatchesMine(maya.id, { viewerId: javy.id, viewerIds: mine.ownerIds })).toBe(false);
    expect(ownerMatchesMine(demoJavier.id, { viewerId: javy.id, viewerIds: mine.ownerIds })).toBe(false);
  });

  it("makes Mine match Team when the agency is only Javy plus his alias row", () => {
    const directory = [javy, francisco];
    const mine = mineScopeForViewer(javy, directory);
    expect(mine.soloBook).toBe(true);
    expect(ownerMatchesMine(francisco.id, { viewerId: javy.id, viewerIds: mine.ownerIds, soloBook: true })).toBe(
      true,
    );
    expect(ownerMatchesMine(null, { viewerId: javy.id, viewerIds: mine.ownerIds, soloBook: true })).toBe(true);
    expect(isSoloProducerBook(javy, [javy, francisco, maya])).toBe(false);
  });

  it("prefers the Admin row as the canonical owner for the Javy identity", () => {
    expect(canonicalProducerId([francisco, javy])).toBe(ADMIN_USER_ID);
    expect(mineOwnerIds(francisco, [javy, francisco])).toEqual(
      expect.arrayContaining([ADMIN_USER_ID, francisco.id]),
    );
    expect(aliasOwnerIds(javy, [javy, francisco])).toEqual([francisco.id]);
  });

  it("maps Zoho Owner 'Francisco Javier Garcia' onto Javy, not the phantom agent", () => {
    const directory = [javy, francisco, maya];
    expect(
      resolveDirectoryOwnerId({ name: "Francisco Javier Garcia", email: null }, directory, ADMIN_USER_ID),
    ).toBe(ADMIN_USER_ID);
    expect(resolveDirectoryOwnerId({ name: "Javy Rivera", email: null }, directory, ADMIN_USER_ID)).toBe(
      ADMIN_USER_ID,
    );
    expect(resolveDirectoryOwnerId({ name: "Maya Chen", email: "maya@fitfirst.local" }, directory, ADMIN_USER_ID)).toBe(
      AGENT_USER_ID,
    );
  });

  it("writes new deals to the logged-in Admin when the inherited owner is his alias", () => {
    expect(
      ownerIdForWrite({
        preferredId: francisco.id,
        preferredUser: francisco,
        actor: javy,
      }),
    ).toBe(ADMIN_USER_ID);
    expect(
      ownerIdForWrite({
        preferredId: maya.id,
        preferredUser: maya,
        actor: javy,
      }),
    ).toBe(AGENT_USER_ID);
  });
});
