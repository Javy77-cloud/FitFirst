import { CALL_OUTCOMES } from "@/lib/domain";
import type { SoftphoneTarget } from "@/components/softphone/softphone-context";

export function SoftphoneDock({
  target,
  returnTo,
}: {
  target: SoftphoneTarget;
  returnTo: string;
}) {
  return (
    <aside
      id="desk-softphone"
      role="dialog"
      aria-label="Desk softphone"
      aria-hidden="false"
      className="ff-card overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2 border-b border-border bg-navy px-3 py-2 text-white">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/70">Desk softphone</div>
          <div className="text-sm font-semibold" data-sp-title>
            {target.title || "Call"}
          </div>
          <div className="text-[11px] text-white/70" data-sp-meta>
            {[target.contactName, target.policyNumber].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div>
            <div className="text-base text-muted-foreground">On-screen timer</div>
            <div className="font-mono text-2xl text-navy" data-sp-timer>
              0:00
            </div>
          </div>
          <div className="text-right text-base text-muted-foreground">
            <div data-sp-phone>{target.phone || "No number on file"}</div>
            {target.phone ? (
              <a
                data-sp-tel
                href={`tel:${target.phone.replace(/[^\d+]/g, "")}`}
                className="text-primary hover:underline"
              >
                tel: fallback
              </a>
            ) : (
              <a data-sp-tel href="#" hidden className="text-primary hover:underline">
                tel: fallback
              </a>
            )}
          </div>
        </div>
        <video data-sp-video muted playsInline hidden className="h-36 w-full rounded-md bg-navy-deep object-cover" />
        <p className="text-base text-muted-foreground" data-sp-media />
        <p className="text-[11px] text-fit-red" data-sp-error />
        <div data-sp-live className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" data-sp-cam />
            Use webcam
          </label>
          <button
            type="button"
            data-sp-start
            className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground"
            {...{ onclick: "window.ffStartSoftphone&&window.ffStartSoftphone()" }}
          >
            Start
          </button>
          <button
            type="button"
            data-sp-hang
            className="inline-flex h-7 items-center rounded-md bg-destructive/10 px-2.5 text-xs font-medium text-destructive"
            {...{ onclick: "window.ffHangSoftphone&&window.ffHangSoftphone()" }}
          >
            Hang up
          </button>
        </div>
        <form
          data-sp-outcome
          action="/api/desk/finish-call"
          method="post"
          className="space-y-2 rounded-md border border-fit-flag/40 bg-fit-flag-bg/40 p-2"
        >
          <p className="text-xs font-semibold text-navy">
            Outcome and notes are required before this call log closes.
          </p>
          <input type="hidden" name="id" value={target.activityId} />
          <input type="hidden" name="durationSeconds" defaultValue="0" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div>
            <label className="text-xs font-medium">Outcome</label>
            <select
              name="outcome"
              required
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select outcome
              </option>
              {CALL_OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {o.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Notes</label>
            <textarea
              name="notes"
              required
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm"
              placeholder="What happened on the line"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground"
          >
            Save duration + outcome
          </button>
        </form>
      </div>
      <script src="/ff-softphone.js" />
    </aside>
  );
}
