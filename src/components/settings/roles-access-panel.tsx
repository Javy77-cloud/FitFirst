"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setAgentFeatureToggle } from "@/app/actions/agent-feature-toggles";
import { flashAction } from "@/lib/flash-client";
import {
  AGENT_FEATURE_TOGGLE_COPY,
  AGENT_FEATURE_TOGGLE_IDS,
  type AgentFeatureToggleId,
  type AgentFeatureToggles,
} from "@/lib/settings/agent-feature-toggles";
import { SETTINGS_ROLE_MATRIX } from "@/lib/settings/roles";
import { chipTabClass } from "@/lib/ui/chip-tabs";

export function RolesAccessPanel({ initial }: { initial: AgentFeatureToggles }) {
  const router = useRouter();
  const [toggles, setToggles] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle(id: AgentFeatureToggleId) {
    const enabled = !toggles[id];
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("enabled", enabled ? "1" : "0");
      const result = await setAgentFeatureToggle(fd);
      if (!result.ok) {
        flashAction(result.error ?? "Could not save", "error");
        return;
      }
      setToggles(result.toggles);
      router.refresh();
      flashAction(enabled ? "On for agents" : "Off for agents");
    });
  }

  return (
    <div className="space-y-4" data-ff-roles-access="">
      <section className="ff-card space-y-3 p-4">
        <h2 className="text-base font-semibold text-navy">Roles matrix</h2>
        <p className="text-sm text-muted-foreground">
          Read-only map of who can do what. Agency-book is the per-agent{" "}
          <code className="text-xs">canSeeAgencyWidgets</code> flag on People / Agents — this page
          does not replace it.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-navy/15 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Scope</th>
                <th className="py-2">What they get</th>
              </tr>
            </thead>
            <tbody>
              {SETTINGS_ROLE_MATRIX.map((role) => (
                <tr key={role.id} className="border-b border-border/70 align-top">
                  <td className="py-2 pr-3 font-semibold text-navy">{role.title}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{role.hint}</td>
                  <td className="py-2 text-navy/80">{role.blurb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ff-card space-y-3 p-4" data-ff-agency-toggles="">
        <h2 className="text-base font-semibold text-navy">What agents may do</h2>
        <p className="text-sm text-muted-foreground">
          Agency-wide toggles. They persist on this tenant. Per-agent book access still lives on
          People / Agents.
        </p>
        {AGENT_FEATURE_TOGGLE_IDS.map((id) => {
          const copy = AGENT_FEATURE_TOGGLE_COPY[id];
          const on = toggles[id];
          return (
            <div
              key={id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              data-ff-agency-toggle={id}
            >
              <div>
                <p className="text-sm font-semibold text-navy">{copy.title}</p>
                <p className="text-helper text-muted-foreground">{copy.hint}</p>
              </div>
              <button
                type="button"
                className={chipTabClass(on)}
                aria-pressed={on}
                disabled={pending}
                data-ff-agency-toggle-btn={id}
                onClick={() => toggle(id)}
              >
                {on ? "On" : "Off"}
              </button>
            </div>
          );
        })}
      </section>

      <p className="text-sm">
        <Link href="/settings/agent-policy-access" className="text-primary hover:underline">
          Agent Policy Access
        </Link>
        <span className="mx-2 text-muted-foreground">·</span>
        <Link href="/settings/agents" className="text-primary hover:underline">
          People / Agents
        </Link>
      </p>
    </div>
  );
}
