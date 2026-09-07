/** Site-wide uploaded-file menu. Same labels, icons, and order everywhere a file row appears. */
export const FILE_ACTION_MENU_ITEMS = [
  { id: "view", label: "View" },
  { id: "download", label: "Download" },
  { id: "replace", label: "Replace" },
  { id: "delete", label: "Delete" },
] as const;

export type FileActionMenuItemId = (typeof FILE_ACTION_MENU_ITEMS)[number]["id"];

export const FILE_ACTION_MENU_LABELS = FILE_ACTION_MENU_ITEMS.map((item) => item.label);

export const FILE_ACTION_ACCEPT =
  ".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*,application/pdf";
