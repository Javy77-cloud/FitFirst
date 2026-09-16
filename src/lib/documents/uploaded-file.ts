/** FormData file parts — Next/server runtimes do not always pass `instanceof File`. */
export function isUploadedFile(item: FormDataEntryValue): item is File {
  if (typeof File !== "undefined" && item instanceof File) {
    return item.size > 0;
  }
  if (typeof item !== "object" || item == null) return false;
  const file = item as Partial<File>;
  return (
    typeof file.arrayBuffer === "function" &&
    typeof file.name === "string" &&
    file.name.length > 0 &&
    typeof file.size === "number" &&
    file.size > 0
  );
}
