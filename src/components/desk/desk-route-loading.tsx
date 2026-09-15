export function DeskRouteLoading() {
  return (
    <div className="flex min-h-screen bg-background" data-ff-route-loading="">
      <aside className="hidden w-60 shrink-0 bg-sidebar md:block" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-card px-5 py-3">
          <div className="h-6 w-40 animate-pulse rounded-md bg-secondary" />
        </div>
        <div className="flex-1 space-y-3 px-5 py-5">
          <div className="h-4 w-64 animate-pulse rounded-md bg-secondary" />
          <div className="h-48 animate-pulse rounded-md bg-secondary" />
          <div className="h-48 animate-pulse rounded-md bg-secondary" />
        </div>
      </div>
    </div>
  );
}
