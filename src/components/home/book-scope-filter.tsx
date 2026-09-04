import type { BookScopeOption } from "@/lib/org/book-scope";

export function BookScopeFilter({
  options,
  current,
  attention,
}: {
  options: BookScopeOption[];
  current: string;
  attention?: string;
}) {
  if (options.length <= 1) return null;
  return (
    <form method="get" action="/" className="flex flex-col gap-1 sm:items-end">
      {attention ? <input type="hidden" name="attention" value={attention} /> : null}
      <label htmlFor="book" className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Admin data filter
      </label>
      <div className="flex items-center gap-2">
        <select
          id="book"
          name="book"
          defaultValue={current}
          className="h-8 rounded-md border border-border bg-card px-2 text-sm text-navy"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-8 rounded-md border border-border bg-card px-2 text-xs font-medium text-navy hover:bg-secondary"
        >
          Apply
        </button>
      </div>
    </form>
  );
}
