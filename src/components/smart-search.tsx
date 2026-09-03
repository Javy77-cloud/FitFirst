export function SmartSearch({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
    <form action="/search" method="get" className="flex items-center gap-1">
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Search leads, deals, contacts, businesses, policies"
        className="h-8 w-40 rounded-md border border-input bg-card px-2 text-xs md:w-64"
      />
      <button
        type="submit"
        className="h-8 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground"
      >
        Search
      </button>
    </form>
  );
}
