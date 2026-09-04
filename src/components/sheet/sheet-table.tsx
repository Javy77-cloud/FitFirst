import { Children, cloneElement, isValidElement, type ReactElement } from "react";
import { sheetIndexValue } from "@/components/sheet/sheet-index";

/**
 * Direct table body. Never nest this inside thead — the browser will hoist it
 * and React will hydrate a different tree than the server sent.
 */
export function SheetTbody({ children, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody {...props}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        const el = child as ReactElement<{ "data-sheet-index"?: string | number }>;
        if (el.type !== "tr") return child;
        const next = sheetIndexValue(el.props["data-sheet-index"], index);
        if (el.props["data-sheet-index"] != null && String(el.props["data-sheet-index"]) === next) {
          return child;
        }
        return cloneElement(el, { "data-sheet-index": next });
      })}
    </tbody>
  );
}

export function SheetRow({
  index,
  children,
  ...props
}: React.ComponentProps<"tr"> & { index: number }) {
  const existing = props["data-sheet-index"];
  return (
    <tr {...props} data-sheet-index={sheetIndexValue(existing, index)}>
      {children}
    </tr>
  );
}
