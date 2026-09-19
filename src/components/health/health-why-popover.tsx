"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { HealthFactorList } from "@/components/health/health-factor-list";
import { useClientMounted } from "@/hooks/use-client-mounted";
import type { HealthChipView } from "@/lib/health/model";
import {
  placeWhyPopover,
  refineWhyPopoverHeight,
  type WhyPopoverAlign,
} from "@/lib/health/place-why-popover";

export function HealthWhyPanel({
  id,
  open,
  onOpenChange,
  anchorRef,
  align = "start",
  children,
}: {
  id?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: RefObject<HTMLElement | null>;
  align?: WhyPopoverAlign;
  children: ReactNode;
}) {
  const mounted = useClientMounted();
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<CSSProperties | null>(null);
  const [place, setPlace] = useState<"below" | "above">("below");

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    function placePanel() {
      const trigger = anchorRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const next = placeWhyPopover(
        trigger,
        { width: window.innerWidth, height: window.innerHeight },
        { align },
      );
      const contentHeight = panelRef.current?.scrollHeight;
      const refined = contentHeight ? refineWhyPopoverHeight(next, contentHeight) : next;
      setPlace(refined.place);
      setBox({
        top: refined.top,
        left: refined.left,
        width: refined.width,
        maxHeight: refined.maxHeight,
      });
    }
    placePanel();
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    return () => {
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
    };
  }, [align, anchorRef, open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onOpenChange(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onOpenChange, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label="Health and risk factors"
      className="ff-health-breakdown ff-health-breakdown-portal"
      data-ff-health-why-panel=""
      data-ff-health-why-place={place}
      style={box ?? { visibility: "hidden" }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function HealthWhyBadge({
  health,
  extraHealth,
  align = "end",
  className,
  children,
  ...rest
}: {
  health: HealthChipView;
  extraHealth?: HealthChipView | null;
  align?: WhyPopoverAlign;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  return (
    <>
      <button
        {...rest}
        ref={triggerRef}
        type="button"
        className={className}
        aria-expanded={open}
        aria-controls={panelId}
        data-ff-health-why=""
        data-ff-no-compare=""
        data-ff-no-title-tip=""
        onClick={(event) => {
          rest.onClick?.(event);
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        {children}
      </button>
      <HealthWhyPanel
        id={panelId}
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        align={align}
      >
        <HealthFactorList health={health} />
        {extraHealth ? <HealthFactorList health={extraHealth} /> : null}
      </HealthWhyPanel>
    </>
  );
}
