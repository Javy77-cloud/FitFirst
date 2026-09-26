/** Who may change pipeline stage structure vs color. */

export type StageActor = {
  signedIn: boolean;
  isAdmin: boolean;
};

export class StageStructureForbiddenError extends Error {
  constructor(message = "Admin only.") {
    super(message);
    this.name = "StageStructureForbiddenError";
  }
}

/** Rename, add, delete, and reorder belong to agency admin only. */
export function stageStructureMutationAllowed(actor: StageActor): boolean {
  return actor.signedIn && actor.isAdmin;
}

/** Any signed-in desk user (agent or admin) may recolor a stage. */
export function stageColorMutationAllowed(actor: Pick<StageActor, "signedIn">): boolean {
  return actor.signedIn;
}

export function assertStageStructureMutation(actor: StageActor): void {
  if (!stageStructureMutationAllowed(actor)) throw new StageStructureForbiddenError();
}

export function assertStageColorMutation(actor: Pick<StageActor, "signedIn">): void {
  if (!stageColorMutationAllowed(actor)) {
    throw new Error("Sign in to change a stage color.");
  }
}
