/**
 * FitFirst widget host stub.
 * Future JS bridge (not implemented — do not add a Zoho Widget SDK):
 *   window.parent.postMessage({ type: "FF_WIDGET_READY" }, origin)
 *   window.FitFirst = { getRecord, setValue, close }
 */
export function WidgetHost({
  name,
  url,
  onClose,
  compact = false,
}: {
  name: string;
  url?: string | null;
  onClose?: () => void;
  compact?: boolean;
}) {
  return (
    <section className={compact ? "rounded-md border border-dashed border-border p-3" : "ff-card p-3"}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-navy">{name}</div>

        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="text-xs text-primary hover:underline">
            Close
          </button>
        ) : null}
      </div>
      {url ? (
        <iframe
          title={name}
          src={url}
          className="h-56 w-full rounded-md border border-border bg-card"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      ) : null}
    </section>
  );
}
