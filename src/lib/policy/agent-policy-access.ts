/** Agency Agent Policy Access — four areas × Read / Write. Write implies Read. */

export const AGENT_POLICY_ACCESS_AREAS = [
  "portalCredentials",
  "commissionBreakdown",
  "lifecycleActions",
  "renewalPipelineDrag",
] as const;

export type AgentPolicyAccessArea = (typeof AGENT_POLICY_ACCESS_AREAS)[number];

export type AgentPolicyAreaFlags = {
  read: boolean;
  write: boolean;
};

export type AgentPolicyAccess = Record<AgentPolicyAccessArea, AgentPolicyAreaFlags>;

export const AGENT_POLICY_ACCESS_LABELS: Record<
  AgentPolicyAccessArea,
  { title: string; hint: string }
> = {
  portalCredentials: {
    title: "Portal credentials",
    hint: "Carrier portal URL, username, and password on the policy’s carrier.",
  },
  commissionBreakdown: {
    title: "Commission breakdown",
    hint: "Rate, earned, and pending commission on Billing.",
  },
  lifecycleActions: {
    title: "Lifecycle actions",
    hint: "Endorse, cancel, and non-renew controls on the policy.",
  },
  renewalPipelineDrag: {
    title: "Renewal pipeline drag",
    hint: "Drag cards between stages on the Renewals board.",
  },
};

export const DEFAULT_AGENT_POLICY_ACCESS: AgentPolicyAccess = {
  portalCredentials: { read: false, write: false },
  commissionBreakdown: { read: false, write: false },
  lifecycleActions: { read: false, write: false },
  renewalPipelineDrag: { read: false, write: false },
};

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function normalizeAgentPolicyAccess(raw: unknown): AgentPolicyAccess {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const next = { ...DEFAULT_AGENT_POLICY_ACCESS };
  for (const area of AGENT_POLICY_ACCESS_AREAS) {
    const row = source[area];
    if (row && typeof row === "object" && !Array.isArray(row)) {
      const read = asBool((row as AgentPolicyAreaFlags).read);
      const write = asBool((row as AgentPolicyAreaFlags).write);
      next[area] = {
        read: read || write,
        write,
      };
    }
  }
  return next;
}

/** Viewer capabilities for the policies module (admins get full access). */
export type PolicyViewerAccess = {
  isAdmin: boolean;
  /** Always true for core policy surfaces (checklist, coverage, docs, timeline, …). */
  coreRead: true;
  /** Core surfaces stay read-only for agents — no write toggle in v1. */
  coreWrite: boolean;
  portalCredentials: AgentPolicyAreaFlags;
  commissionBreakdown: AgentPolicyAreaFlags;
  lifecycleActions: AgentPolicyAreaFlags;
  renewalPipelineDrag: AgentPolicyAreaFlags;
};

export function resolvePolicyViewerAccess(
  isAdmin: boolean,
  access: AgentPolicyAccess,
): PolicyViewerAccess {
  if (isAdmin) {
    const full = { read: true, write: true };
    return {
      isAdmin: true,
      coreRead: true,
      coreWrite: true,
      portalCredentials: full,
      commissionBreakdown: full,
      lifecycleActions: full,
      renewalPipelineDrag: full,
    };
  }
  return {
    isAdmin: false,
    coreRead: true,
    coreWrite: false,
    portalCredentials: { ...access.portalCredentials },
    commissionBreakdown: { ...access.commissionBreakdown },
    lifecycleActions: { ...access.lifecycleActions },
    renewalPipelineDrag: { ...access.renewalPipelineDrag },
  };
}

export function patchAgentPolicyAccess(
  current: AgentPolicyAccess,
  area: AgentPolicyAccessArea,
  patch: Partial<AgentPolicyAreaFlags>,
): AgentPolicyAccess {
  const prev = current[area];
  let read = patch.read ?? prev.read;
  let write = patch.write ?? prev.write;
  if (patch.write === true) {
    read = true;
  }
  if (patch.read === false) {
    write = false;
  }
  return {
    ...current,
    [area]: { read, write },
  };
}
