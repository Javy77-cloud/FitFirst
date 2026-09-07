"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { loadMeetingDefaults, scheduleDealMeeting, type MeetingDefaults } from "@/app/actions/meetings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MEETING_TYPE_LABEL,
  MEETING_TYPES,
  VIDEO_PROVIDER_LABEL,
  VIDEO_PROVIDERS,
  resolveMeetingPlace,
  videoLinkFor,
  type MeetingType,
  type VideoProvider,
} from "@/lib/meetings/types";

export function MeetingButton({
  dealId,
  homeAddress,
  className,
  style,
}: {
  dealId: string;
  homeAddress?: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [defaults, setDefaults] = useState<MeetingDefaults | null>(null);
  const [type, setType] = useState<MeetingType>("video");
  const [provider, setProvider] = useState<VideoProvider>("zoom");
  const [location, setLocation] = useState(homeAddress ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function openForm() {
    setOpen(true);
    setError(null);
    try {
      const next = await loadMeetingDefaults(dealId);
      setDefaults(next);
      setType("video");
      const nextProvider = next.videoProvider ?? "zoom";
      setProvider(nextProvider);
      const place = resolveMeetingPlace({
        type: "video",
        homeAddress: homeAddress ?? next.homeAddress,
        officeAddress: next.officeAddress,
        videoProvider: nextProvider,
        videoUrl: videoLinkFor(nextProvider, next) ?? next.videoUrl,
      });
      setLocation(place.location ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load meeting settings.");
    }
  }

  function applyType(nextType: MeetingType) {
    setType(nextType);
    if (!defaults) return;
    const place = resolveMeetingPlace({
      type: nextType,
      homeAddress: homeAddress ?? defaults.homeAddress,
      officeAddress: defaults.officeAddress,
      videoProvider: provider,
      videoUrl: videoLinkFor(provider, defaults) ?? defaults.videoUrl,
    });
    setLocation(place.location ?? "");
  }

  function applyProvider(next: VideoProvider) {
    setProvider(next);
    if (!defaults || type !== "video") return;
    setLocation(videoLinkFor(next, defaults) ?? "");
  }

  const hint = resolveMeetingPlace({
    type,
    homeAddress: homeAddress ?? defaults?.homeAddress,
    officeAddress: defaults?.officeAddress,
    videoProvider: provider,
    videoUrl: location,
  }).hint;
  const videoHref = type === "video" && location.startsWith("http") ? location : null;

  return (
    <div className="inline">
      <button
        type="button"
        onClick={() => void openForm()}
        className={
          className ??
          "rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-navy hover:bg-muted"
        }
        style={style}
      >
        Meeting
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-3 sm:items-center">
          <form
            className="w-full max-w-md space-y-3 rounded-lg border border-border bg-card p-4 shadow-lg"
            action={(formData) => {
              startTransition(async () => {
                try {
                  await scheduleDealMeeting(formData);
                  setOpen(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not save the meeting.");
                }
              });
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-navy">Schedule a meeting</h2>
                <p className="text-[11px] text-muted-foreground">
                  Video-call, In-Home, or In-Office. Nothing syncs to Google Calendar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground hover:text-navy"
              >
                Close
              </button>
            </div>
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="meetingType" value={type} />
            <input type="hidden" name="videoProvider" value={provider} />
            <div>
              <Label className="text-xs">Type</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {MEETING_TYPES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => applyType(item)}
                    className={
                      type === item
                        ? "rounded-md bg-primary px-2 py-0.5 text-xs text-primary-foreground"
                        : "rounded-md border border-border px-2 py-0.5 text-xs text-navy hover:bg-muted"
                    }
                  >
                    {MEETING_TYPE_LABEL[item]}
                  </button>
                ))}
              </div>
            </div>
            {type === "video" ? (
              <div>
                <Label className="text-xs">Video room</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {VIDEO_PROVIDERS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => applyProvider(item)}
                      className={
                        provider === item
                          ? "rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-navy"
                          : "rounded-md border border-border px-2 py-0.5 text-xs text-navy hover:bg-muted"
                      }
                    >
                      {VIDEO_PROVIDER_LABEL[item]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <Label className="text-xs">When</Label>
              <Input
                name="startAt"
                type="datetime-local"
                className="mt-1 h-8"
                defaultValue={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
              />
            </div>
            <div>
              <Label className="text-xs">
                {type === "video" ? "Link" : type === "in_home" ? "Insured address" : "Office address"}
              </Label>
              <Input
                name="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="mt-1 h-8"
                placeholder={type === "video" ? "https://" : "Street, city, ZIP"}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {videoHref ? (
                <a
                  href={videoHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Open {VIDEO_PROVIDER_LABEL[provider]}
                </a>
              ) : null}
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Save meeting"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
