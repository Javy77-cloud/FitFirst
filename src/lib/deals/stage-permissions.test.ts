import { describe, expect, it } from "vitest";
import {
  assertStageColorMutation,
  assertStageStructureMutation,
  StageStructureForbiddenError,
  stageColorMutationAllowed,
  stageStructureMutationAllowed,
} from "@/lib/deals/stage-permissions";

const admin = { signedIn: true, isAdmin: true };
const agent = { signedIn: true, isAdmin: false };
const guest = { signedIn: false, isAdmin: false };

describe("pipeline stage mutation permissions", () => {
  it("lets an agent change color and blocks structure edits", () => {
    expect(stageColorMutationAllowed(agent)).toBe(true);
    expect(stageStructureMutationAllowed(agent)).toBe(false);
    expect(() => assertStageColorMutation(agent)).not.toThrow();
    expect(() => assertStageStructureMutation(agent)).toThrow(StageStructureForbiddenError);
  });

  it("lets an agency admin change color and structure", () => {
    expect(stageColorMutationAllowed(admin)).toBe(true);
    expect(stageStructureMutationAllowed(admin)).toBe(true);
    expect(() => assertStageStructureMutation(admin)).not.toThrow();
  });

  it("blocks a signed-out caller from color and structure", () => {
    expect(stageColorMutationAllowed(guest)).toBe(false);
    expect(stageStructureMutationAllowed(guest)).toBe(false);
    expect(() => assertStageColorMutation(guest)).toThrow(/Sign in to change a stage color/);
    expect(() => assertStageStructureMutation(guest)).toThrow(StageStructureForbiddenError);
  });
});
