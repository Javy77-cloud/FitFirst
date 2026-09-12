export const PAGE_FILTER_MODULES = ["contacts", "businesses", "policies", "carriers"] as const;

export type PageFilterModule = (typeof PAGE_FILTER_MODULES)[number];

export type PageFilterOption = {
  value: string;
  label: string;
  color?: string | null;
};

export type PageFilter = {
  id: string;
  label: string;
  fieldKey: string;
  enabled: boolean;
  options: PageFilterOption[];
};

export type PageFilterField = {
  key: string;
  label: string;
};

export type PageFilterPrefs = {
  module: PageFilterModule;
  filters: PageFilter[];
};

export const PAGE_FILTER_COLOR_PRESETS = [
  "#002868",
  "#BF0A30",
  "#EAB308",
  "#F97316",
  "#15803D",
  "#64748B",
] as const;

/** Longer contains-search + thin darker gray border (page-filter lists). */
export const PAGE_FILTER_SEARCH_CLASS = "min-w-72";
export const PAGE_FILTER_SEARCH_INPUT_CLASS = "h-8 w-80 border-[#6b7280]";
