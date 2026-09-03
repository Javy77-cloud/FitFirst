import { switchDeskRole } from "@/app/actions/brand";
import type { DeskActor } from "@/lib/brand/desk-role";
import type { ResolvedUiPrefs } from "@/lib/brand/resolve";
import { Button } from "@/components/ui/button";

export function BrandStyle({ prefs }: { prefs: ResolvedUiPrefs }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.documentElement.dataset.ffColor=${JSON.stringify(prefs.colorPreset)};document.documentElement.dataset.ffFont=${JSON.stringify(prefs.fontPreset)};document.documentElement.dataset.ffDensity=${JSON.stringify(prefs.density)};`,
      }}
    />
  );
}

export function AgencyMark({
  agencyName,
  logoUrl,
}: {
  agencyName: string;
  logoUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="size-8 shrink-0 rounded-sm bg-white object-contain p-0.5"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-sidebar-accent text-[11px] font-semibold text-white"
        >
          {initials(agencyName)}
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold leading-tight text-white">
          {agencyName}
        </div>
        <div className="truncate text-[10px] text-sidebar-foreground/60">FitFirst desk</div>
      </div>
    </div>
  );
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "J") + (parts[1]?.[0] ?? "G")).toUpperCase();
}

export function DeskRoleSwitcher({
  actor,
  compact = false,
}: {
  actor: DeskActor;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex items-center gap-1" : "space-y-1.5"}>
      {compact ? null : (
        <div className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50">
          Acting as
        </div>
      )}
      <div className="flex gap-1">
        <form action={switchDeskRole} className="flex-1">
          <input type="hidden" name="role" value="admin" />
          <Button
            type="submit"
            size="xs"
            variant={actor.role === "admin" ? "secondary" : "ghost"}
            className="w-full text-sidebar-foreground"
          >
            Admin
          </Button>
        </form>
        <form action={switchDeskRole} className="flex-1">
          <input type="hidden" name="role" value="agent" />
          <Button
            type="submit"
            size="xs"
            variant={actor.role === "agent" ? "secondary" : "ghost"}
            className="w-full text-sidebar-foreground"
          >
            Agent
          </Button>
        </form>
      </div>
      {compact ? null : (
        <p className="text-[11px] text-sidebar-foreground/70">
          {actor.name} · {actor.label}
          {actor.role === "admin" ? " sets agency chrome" : " — your desk only"}
        </p>
      )}
    </div>
  );
}
