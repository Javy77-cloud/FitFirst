import type { ListPersistField } from "@/lib/settings/list-editor";

/** Hidden form fields for collapsed list rows so Save keeps full order. */
export function ListOptionPersist({
  form,
  fields,
}: {
  form?: string;
  fields: readonly ListPersistField[];
}) {
  if (fields.length === 0) return null;
  return (
    <>
      {fields.map((field, index) => (
        <input
          key={`${field.name}:${index}`}
          type="hidden"
          form={form}
          name={field.name}
          value={field.value}
          data-ff-list-option-persist={field.name}
        />
      ))}
    </>
  );
}
