"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { ChevronDown, GripVertical, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  resetContactSectionNav,
  saveContactSectionNav,
} from "@/app/actions/contact-section-nav";
import {
  CONTACT_COMMUNICATIONS_CHIP_ID,
  CONTACT_COMMUNICATION_SECTION_IDS,
  CONTACT_SECTION_NAV_MAX,
  CONTACT_SECTION_POOL,
  DEFAULT_CONTACT_SECTION_NAV_IDS,
  addCommunicationsToNav,
  communicationCountSum,
  contactCustomizeDefs,
  contactNavChips,
  isContactCommunicationSectionId,
  isContactSectionId,
  normalizeContactSectionNavIds,
  removeCommunicationsFromNav,
  reorderNavTreatingCommunications,
  type ContactSectionId,
} from "@/lib/desk/contact-sections";
import {
  contactTabFromSection,
  parseContactTab,
  type ContactTabSlug,
} from "@/lib/desk/contact-tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { cn } from "@/lib/utils";

export type ContactSectionCounts = Partial<Record<ContactSectionId, number>>;

export function ContactSectionNav({
  selectedIds,
  counts = {},
  onNavigate,
  activeTab,
  basePath,
  mode = "tabs",
  endSlot,
}: {
  selectedIds: ContactSectionId[];
  counts?: ContactSectionCounts;
  /** Called when a chip is clicked (after/with jump). Accordion host uses this. */
  onNavigate?: (id: ContactSectionId) => void;
  /** Active URL tab slug when mode is tabs. */
  activeTab?: ContactTabSlug | string | null;
  /** Contact path for tab hrefs, e.g. `/contacts/<id>`. */
  basePath?: string;
  /** `tabs` = true panels via ?tab=; `scroll` = legacy anchor jump. */
  mode?: "tabs" | "scroll";
  /** Right-aligned slot after Customize (e.g. ··· overflow menu). */
  endSlot?: ReactNode;
}) {
  const router = useRouter();
  const resolvedTab = parseContactTab(activeTab ?? null, null);
  const [active, setActive] = useState<ContactSectionId>(() => {
    if (mode === "tabs") {
      const fromTab =
        resolvedTab === "communications"
          ? "emails"
          : resolvedTab === "glance"
            ? "at-a-glance"
            : resolvedTab === "details"
              ? "contact-details"
              : (resolvedTab as ContactSectionId);
      return fromTab;
    }
    return normalizeContactSectionNavIds(selectedIds)[0] ?? "at-a-glance";
  });
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [draftSelected, setDraftSelected] = useState<ContactSectionId[]>(() =>
    normalizeContactSectionNavIds(selectedIds),
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [pinBox, setPinBox] = useState({ left: 0, width: 0 });
  const hostRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const didHashJump = useRef(false);

  const chips = useMemo(() => contactNavChips(selectedIds), [selectedIds]);
  const sections = useMemo(
    () =>
      chips.flatMap((chip) =>
        chip.kind === "communications" ? chip.children : [{ id: chip.id, label: chip.label }],
      ),
    [chips],
  );

  useEffect(() => {
    if (mode === "tabs") return;
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.id;
        if (id) setActive(id as ContactSectionId);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.15, 0.4, 0.7] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [sections, mode]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPinned(!entry.isIntersecting),
      { threshold: [0], rootMargin: "0px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function measure() {
      const host = hostRef.current;
      if (host) {
        const rect = host.getBoundingClientRect();
        setPinBox({ left: rect.left, width: rect.width });
      }
      if (navRef.current) setNavHeight(navRef.current.offsetHeight);
    }
    measure();
    const host = hostRef.current;
    const ro = host ? new ResizeObserver(measure) : null;
    if (host && ro) ro.observe(host);
    window.addEventListener("resize", measure);
    // Keep left/width locked while floating (sidebar / rail / scrollbars).
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [sections, pinned]);

  function tabHref(id: ContactSectionId): string {
    const tab = contactTabFromSection(id);
    const base = basePath || (typeof window !== "undefined" ? window.location.pathname : "");
    return `${base}?tab=${tab}`;
  }

  function jump(id: ContactSectionId) {
    setActive(id);
    onNavigate?.(id);
    if (chipsRef.current) chipsRef.current.scrollLeft = 0;
    if (mode === "tabs") {
      const href = tabHref(id);
      router.push(href, { scroll: false });
      return;
    }
    history.replaceState(null, "", `#${id}`);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (!target) return;
        const offset = Math.max(navHeight, 56) + 8;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      });
    });
  }

  useEffect(() => {
    if (didHashJump.current) return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !isContactSectionId(hash)) return;
    didHashJump.current = true;
    const target = document.getElementById(hash);
    if (!target) return;
    const offset = Math.max(navHeight, 56) + 8;
    window.scrollTo({
      top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset),
      behavior: "smooth",
    });
  }, [sections, navHeight]);

  function openCustomize() {
    setError(null);
    setDraftSelected(normalizeContactSectionNavIds(selectedIds));
    setCustomizeOpen(true);
  }

  function moveToSelected(id: string) {
    setDraftSelected((prev) => {
      if (id === CONTACT_COMMUNICATIONS_CHIP_ID) {
        if (prev.some(isContactCommunicationSectionId)) return prev;
        const next = addCommunicationsToNav(prev);
        if (!next.some(isContactCommunicationSectionId)) {
          setError(`Select at most ${CONTACT_SECTION_NAV_MAX} sections.`);
          return prev;
        }
        setError(null);
        return next;
      }
      if (!isContactSectionId(id) || prev.includes(id)) return prev;
      if (prev.length >= CONTACT_SECTION_NAV_MAX) {
        setError(`Select at most ${CONTACT_SECTION_NAV_MAX} sections.`);
        return prev;
      }
      setError(null);
      return [...prev, id];
    });
  }

  function moveToAvailable(id: string) {
    setError(null);
    if (id === CONTACT_COMMUNICATIONS_CHIP_ID) {
      setDraftSelected((prev) => removeCommunicationsFromNav(prev));
      return;
    }
    setDraftSelected((prev) => prev.filter((x) => x !== id));
  }

  function reorderSelected(fromId: string, toId: string) {
    setDraftSelected((prev) => reorderNavTreatingCommunications(prev, fromId, toId));
  }

  function onSave() {
    startTransition(async () => {
      try {
        await saveContactSectionNav(draftSelected);
        setCustomizeOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function onReset() {
    startTransition(async () => {
      try {
        const saved = await resetContactSectionNav();
        setDraftSelected(saved);
        setCustomizeOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reset.");
      }
    });
  }

  const customize = contactCustomizeDefs(draftSelected);
  const available = customize.available;
  const selectedDefs = customize.selected;
  const commsActive =
    mode === "tabs"
      ? resolvedTab === "communications"
      : isContactCommunicationSectionId(active);
  const commsCount = communicationCountSum(counts);

  const chipExtras =
    "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap !text-xs !font-medium leading-none";

  return (
    <div ref={hostRef} className="relative mb-3" data-ff-contact-nav-host-box="">
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden data-ff-contact-nav-sentinel="" />
      {pinned ? <div style={{ height: navHeight }} aria-hidden data-ff-contact-nav-spacer="" /> : null}
      <nav
        ref={navRef}
        aria-label="Contact sections"
        className={cn(
          "z-40 border-b border-border bg-card/95 px-1 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90",
          pinned ? "fixed top-0" : "relative",
        )}
        style={
          pinned
            ? { left: pinBox.left, width: pinBox.width, maxWidth: pinBox.width }
            : undefined
        }
        data-ff-contact-section-nav="top"
        data-ff-contact-nav-pinned={pinned ? "1" : "0"}
      >
        <div
          ref={chipsRef}
          className={cn(
            FF_CHIP_TAB_GROUP,
            "w-full max-w-full flex-wrap items-center",
          )}
          onScroll={(e) => {
            // Never let chip focus scroll the strip sideways.
            e.currentTarget.scrollLeft = 0;
          }}
        >
          {chips.map((chip) => {
            if (chip.kind === "communications") {
              return (
                <DropdownMenu key={chip.id}>
                  <DropdownMenuTrigger
                    className={chipTabClass(commsActive, chipExtras)}
                    data-ff-contact-nav-item={CONTACT_COMMUNICATIONS_CHIP_ID}
                    data-active={commsActive ? "true" : "false"}
                    aria-label="Communications"
                  >
                    <span>Communications</span>
                    <span
                      className={cn(
                        "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums leading-none",
                        commsCount > 0 ? "bg-[#BF0A30] text-white" : "invisible",
                      )}
                      data-ff-contact-nav-badge={CONTACT_COMMUNICATIONS_CHIP_ID}
                      aria-hidden={commsCount > 0 ? undefined : true}
                    >
                      {commsCount}
                    </span>
                    <ChevronDown className="size-3 shrink-0 opacity-70" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" data-ff-contact-nav-comms="">
                    {CONTACT_COMMUNICATION_SECTION_IDS.map((id) => {
                      const child = chip.children.find((item) => item.id === id);
                      const count = counts[id] ?? 0;
                      return (
                        <DropdownMenuItem
                          key={id}
                          onClick={() => jump(id)}
                          data-ff-contact-nav-comms-item={id}
                        >
                          <span className="min-w-0 flex-1">{child?.label ?? id}</span>
                          <span
                            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-semibold tabular-nums leading-none"
                            data-ff-contact-nav-comms-count={id}
                          >
                            {count}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            const count = counts[chip.id] ?? 0;
            const isActive =
              mode === "tabs"
                ? contactTabFromSection(chip.id) === resolvedTab
                : active === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => jump(chip.id)}
                data-ff-contact-nav-item={chip.id}
                data-active={isActive ? "true" : "false"}
                className={chipTabClass(isActive, chipExtras)}
              >
                <span>{chip.label}</span>
                <span
                  className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums leading-none",
                    count > 0
                      ? "bg-[#BF0A30] text-white"
                      : "invisible",
                  )}
                  data-ff-contact-nav-badge={chip.id}
                  aria-hidden={count > 0 ? undefined : true}
                >
                  {count > 0 ? count : 0}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={openCustomize}
            className={chipTabClass(false, chipExtras)}
            data-ff-contact-nav-edit=""
            aria-label="Customize"
            title="Customize"
          >
            <Settings2 className="size-3 shrink-0" />
            Customize
          </button>
          {endSlot ? (
            <div className="ml-auto flex shrink-0 items-center" data-ff-contact-nav-end="">
              {endSlot}
            </div>
          ) : null}
        </div>
      </nav>

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="sm:max-w-lg" data-ff-contact-nav-customize="">
          <DialogHeader>
            <DialogTitle>Edit Nav</DialogTitle>

          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border p-2" data-ff-contact-nav-selected="">
              <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
                Selected ({draftSelected.length}/{CONTACT_SECTION_NAV_MAX})
              </p>
              <ul className="space-y-1">
                {selectedDefs.map((section) => (
                  <li
                    key={section.id}
                    draggable
                    onDragStart={(event) => {
                      setDragId(section.id);
                      event.dataTransfer.setData("text/plain", section.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => {
                      if (!dragId || dragId === section.id) return;
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!dragId) return;
                      reorderSelected(dragId, section.id);
                      setDragId(null);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "flex cursor-grab items-center gap-1 rounded-md px-1.5 py-1 text-sm text-[#002868]",
                      dragId === section.id && "bg-muted",
                    )}
                  >
                    <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{section.label}</span>
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-[#BF0A30]"
                      onClick={() => moveToAvailable(section.id)}
                    >
                      Hide
                    </button>
                  </li>
                ))}
                {selectedDefs.length === 0 ? (
                  <li className="px-1 py-2 text-xs text-muted-foreground">None selected.</li>
                ) : null}
              </ul>
            </div>
            <div className="rounded-md border border-border p-2" data-ff-contact-nav-available="">
              <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
                Available
              </p>
              <ul className="space-y-1">
                {available.map((section) => (
                  <li
                    key={section.id}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-muted-foreground"
                  >
                    <span className="min-w-0 flex-1 truncate">{section.label}</span>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-[#002868] hover:underline disabled:opacity-40"
                      disabled={draftSelected.length >= CONTACT_SECTION_NAV_MAX}
                      onClick={() => moveToSelected(section.id)}
                    >
                      Add
                    </button>
                  </li>
                ))}
                {available.length === 0 ? (
                  <li className="px-1 py-2 text-xs text-muted-foreground">All sections selected.</li>
                ) : null}
              </ul>
            </div>
          </div>
          {error ? <p className="text-sm text-[#BF0A30]">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onReset}>
              Reset
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setCustomizeOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={pending} onClick={onSave}>
                Save
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Default:{" "}
            {DEFAULT_CONTACT_SECTION_NAV_IDS.map(
              (id) => CONTACT_SECTION_POOL.find((s) => s.id === id)?.label,
            ).join(", ")}
            .
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
