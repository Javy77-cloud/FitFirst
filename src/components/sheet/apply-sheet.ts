import {
  compareSheetValues,
  type SheetLayout,
  type SheetSort,
} from "@/lib/desk/sheet-layout";

function cellText(row: Element, col: string): string {
  const cell = row.querySelector(`[data-sheet-col="${cssEscape(col)}"]`);
  if (!cell) return "";
  return (cell.getAttribute("data-sort") || cell.textContent || "").replace(/\s+/g, " ").trim();
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/"/g, '\\"');
}

function isShown(el: HTMLElement): boolean {
  if (el.hidden || el.style.display === "none") return false;
  const display = getComputedStyle(el).display;
  return display !== "none";
}

function rememberOrder(row: HTMLElement, index: number) {
  if (row.dataset.sheetIndex == null) row.dataset.sheetIndex = String(index);
}

export function applySheetSort(tableEl: HTMLElement, sort: SheetSort | null) {
  tableEl.querySelectorAll("tbody").forEach((tbody) => {
    const rows = Array.from(tbody.querySelectorAll(":scope > tr")) as HTMLElement[];
    rows.forEach((row, index) => rememberOrder(row, index));
    const locked = rows.filter((row) => row.querySelector("[colspan]"));
    const sortable = rows.filter((row) => !row.querySelector("[colspan]"));
    const next = sort
      ? [...sortable].sort((a, b) => {
          const cmp = compareSheetValues(cellText(a, sort.key), cellText(b, sort.key));
          return sort.dir === "asc" ? cmp : -cmp;
        })
      : [...sortable].sort(
          (a, b) => Number(a.dataset.sheetIndex ?? 0) - Number(b.dataset.sheetIndex ?? 0),
        );
    [...next, ...locked].forEach((row) => tbody.appendChild(row));
  });
}

export function applySheetPins(tableEl: HTMLElement, pinned: string[]) {
  tableEl.querySelectorAll<HTMLElement>("[data-sheet-col].ff-col-pinned").forEach((el) => {
    if (!pinned.includes(el.dataset.sheetCol ?? "")) {
      el.classList.remove("ff-col-pinned");
      el.style.removeProperty("--ff-pin-left");
    }
  });

  let left = 0;
  for (const col of pinned) {
    const cells = Array.from(
      tableEl.querySelectorAll<HTMLElement>(`[data-sheet-col="${cssEscape(col)}"]`),
    );
    const sample = cells.find(isShown);
    if (!sample) continue;
    const width = sample.getBoundingClientRect().width;
    cells.forEach((cell) => {
      if (!cell.classList.contains("ff-col-pinned")) cell.classList.add("ff-col-pinned");
      const next = `${left}px`;
      if (cell.style.getPropertyValue("--ff-pin-left") !== next) {
        cell.style.setProperty("--ff-pin-left", next);
      }
    });
    left += width;
  }
}

export function applySheetDom(tableEl: HTMLElement, layout: SheetLayout) {
  applySheetSort(tableEl, layout.sort);
  applySheetPins(tableEl, layout.pinned);
}
