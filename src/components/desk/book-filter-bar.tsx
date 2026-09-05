import { HiddenLiveQuery } from "@/components/search/hidden-live-query";
import type { DeskLineSettings } from "@/lib/desk/line-settings";
import { visiblePolicyBooks } from "@/lib/desk/line-settings";

export function BookFilterBar({
  action,
  settings,
  family,
  pcSub,
  lifeSub,
  healthSub,
  hidden,
  hideFamily,
  searchModuleId,
}: {
  action: string;
  settings: DeskLineSettings;
  family?: string;
  pcSub?: string;
  lifeSub?: string;
  healthSub?: string;
  hidden?: Record<string, string>;
  hideFamily?: boolean;
  searchModuleId?: string;
}) {
  const books = visiblePolicyBooks(settings);
  const showLife = family === "life" && settings.writeLife;
  const showHealth = family === "health" && settings.writeHealth;
  const showPc = !hideFamily && (!family || family === "pc" || family === "");

  return (
    <form action={action} method="get" className="mb-3 flex flex-wrap gap-2 text-sm">
      {hidden
        ? Object.entries(hidden)
            .filter(([name]) => name !== "q")
            .map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))
        : null}
      {searchModuleId ? <HiddenLiveQuery moduleId={searchModuleId} /> : null}
      {hideFamily ? (
        family ? <input type="hidden" name="family" value={family} /> : null
      ) : (
        <select
          name="family"
          defaultValue={family ?? ""}
          className="h-8 rounded-md border border-input bg-card px-2"
          aria-label="Book family"
        >
          {books.map((book) => (
            <option key={book.id} value={book.id === "all" ? "" : book.id}>
              {book.label}
            </option>
          ))}
        </select>
      )}
      {showPc ? (
        <select
          name="pcSub"
          defaultValue={pcSub ?? ""}
          className="h-8 rounded-md border border-input bg-card px-2"
          aria-label="P&C subfilter"
        >
          <option value="">P&amp;C subfilter</option>
          <option value="home">Home</option>
          <option value="auto">Auto</option>
          <option value="flood">Flood</option>
          <option value="commercial">Commercial</option>
        </select>
      ) : null}
      {showLife ? (
        <select
          name="lifeSub"
          defaultValue={lifeSub ?? ""}
          className="h-8 rounded-md border border-input bg-card px-2"
          aria-label="Life subfilter"
        >
          <option value="">All Life</option>
          {settings.lifeOptions.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      {showHealth ? (
        <select
          name="healthSub"
          defaultValue={healthSub ?? ""}
          className="h-8 rounded-md border border-input bg-card px-2"
          aria-label="Health subfilter"
        >
          <option value="">All Health</option>
          {settings.healthOptions.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      <button type="submit" className="h-8 rounded-md border border-input px-3 text-xs">
        Apply
      </button>
    </form>
  );
}
