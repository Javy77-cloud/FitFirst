export function FunnelIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      data-filter-icon={active ? "active" : "idle"}
      className="size-4"
    >
      <path
        d="M2.25 2.4h11.5L9.4 8.05v4.15L6.6 13.7V8.05L2.25 2.4Z"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.55 : 0}
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  );
}
