import type { ReactNode } from "react";

export function LayoutRequiredBadge() {
  return (
    <span
      className="shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1d4e89]"
      data-ff-required-badge
    >
      Required
    </span>
  );
}

export function LayoutSectionHeader({
  title,
  badge,
  action,
  help,
  tone = "default",
}: {
  title: string;
  badge?: ReactNode;
  action?: ReactNode;
  help?: ReactNode;
  /** Contact Details uses a quieter left title so field values carry the page. */
  tone?: "default" | "contact";
}) {
  const contact = tone === "contact";
  return (
    <div className={contact ? "mb-0.5" : "mb-1"} data-ff-layout-section-header="">
      <div className={contact ? "flex items-center gap-1.5" : "flex items-center justify-center gap-1.5"}>
        <h3
          className={
            contact
              ? "text-sm font-semibold leading-snug text-[#002868]"
              : "text-center text-lg font-semibold leading-snug text-[#002868]"
          }
        >
          {title}
        </h3>
        {help}
        {badge}
      </div>
      {action ? (
        <div className={contact ? "mt-1 flex" : "mt-1.5 flex justify-center"}>{action}</div>
      ) : null}
    </div>
  );
}
