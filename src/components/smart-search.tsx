export function SmartSearch({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
    <form action="/search" method="get" className="flex max-w-xl items-center gap-1">
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Search leads, deals, contacts, businesses, policies"
        className="h-9 w-full min-w-40 rounded-md border border-input bg-card px-2 text-sm md:min-w-72"
      />
      <button
        type="submit"
        className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
      >
        Search
      </button>
    </form>
  );
}
