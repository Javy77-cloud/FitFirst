"use client";

import {
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  INBOX_LIST_BODY_MIN,
  INBOX_LIST_WIDTH_DEFAULT,
  INBOX_LIST_WIDTH_MIN,
  INBOX_LIST_WIDTH_STORAGE_KEY,
  INBOX_SPLITTER_KEY_STEP,
  INBOX_SPLITTER_WIDTH,
  clampInboxListWidth,
  nudgeInboxListWidth,
  parseInboxListWidth,
} from "@/lib/desk/inbox-split";

const STACK_QUERY = "(max-width: 900px)";

type Listener = () => void;

const widthListeners = new Set<Listener>();

function subscribeInboxListWidth(listener: Listener) {
  widthListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === INBOX_LIST_WIDTH_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    widthListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function notifyInboxListWidth() {
  for (const listener of widthListeners) listener();
}

function readStoredWidthRaw(): string {
  try {
    return window.localStorage.getItem(INBOX_LIST_WIDTH_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function inboxListWidthSnapshot(): string {
  return readStoredWidthRaw();
}

function inboxListWidthServerSnapshot(): string {
  return "";
}

function writeStoredWidth(width: number | null) {
  try {
    if (width == null) window.localStorage.removeItem(INBOX_LIST_WIDTH_STORAGE_KEY);
    else window.localStorage.setItem(INBOX_LIST_WIDTH_STORAGE_KEY, String(width));
  } catch {
    /* private mode / quota */
  }
  notifyInboxListWidth();
}

function subscribeStacked(listener: Listener) {
  const media = window.matchMedia(STACK_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function stackedSnapshot(): boolean {
  return window.matchMedia(STACK_QUERY).matches;
}

function stackedServerSnapshot(): boolean {
  return false;
}

export function InboxSplit({ list, detail }: { list: ReactNode; detail: ReactNode | null }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const grabOffsetRef = useRef(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const storedRaw = useSyncExternalStore(
    subscribeInboxListWidth,
    inboxListWidthSnapshot,
    inboxListWidthServerSnapshot,
  );
  const stacked = useSyncExternalStore(subscribeStacked, stackedSnapshot, stackedServerSnapshot);
  const preferred = parseInboxListWidth(storedRaw);
  const [live, setLive] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const shown = live ?? preferred;

  const setFrame = useCallback((node: HTMLDivElement | null) => {
    frameRef.current = node;
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const next = Math.round(node.getBoundingClientRect().width);
      setContainerWidth((current) => (current === next ? current : next));
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  function containerBox() {
    const rect = frameRef.current?.getBoundingClientRect();
    return { left: rect?.left ?? 0, width: rect?.width || containerWidth };
  }

  function widthAt(clientX: number) {
    const box = containerBox();
    return clampInboxListWidth(clientX - box.left - grabOffsetRef.current, box.width);
  }

  const max =
    containerWidth > 0
      ? Math.max(INBOX_LIST_WIDTH_MIN, Math.round(containerWidth - INBOX_SPLITTER_WIDTH - INBOX_LIST_BODY_MIN))
      : 1600;
  const min = Math.min(INBOX_LIST_WIDTH_MIN, max);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (stacked || event.button !== 0) return;
    event.preventDefault();
    const box = containerBox();
    const list = frameRef.current?.querySelector(".ff-inbox-list-pane");
    const measured = list?.getBoundingClientRect().width ?? shown ?? INBOX_LIST_WIDTH_DEFAULT;
    grabOffsetRef.current = event.clientX - (box.left + measured);
    dragRef.current = true;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setLive(Math.round(measured));
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || stacked) return;
    setLive(widthAt(event.clientX));
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    dragRef.current = false;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const next = widthAt(event.clientX);
    setLive(null);
    writeStoredWidth(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (stacked) return;
    const box = containerBox();
    const list = frameRef.current?.querySelector(".ff-inbox-list-pane");
    const current = Math.round(list?.getBoundingClientRect().width ?? shown ?? INBOX_LIST_WIDTH_DEFAULT);
    const step = event.shiftKey ? INBOX_SPLITTER_KEY_STEP * 3 : INBOX_SPLITTER_KEY_STEP;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      writeStoredWidth(nudgeInboxListWidth(current, -step, box.width));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      writeStoredWidth(nudgeInboxListWidth(current, step, box.width));
    } else if (event.key === "Home") {
      event.preventDefault();
      writeStoredWidth(clampInboxListWidth(INBOX_LIST_WIDTH_MIN, box.width));
    } else if (event.key === "End") {
      event.preventDefault();
      writeStoredWidth(clampInboxListWidth(box.width, box.width));
    }
  }

  function onDoubleClick() {
    setLive(null);
    writeStoredWidth(null);
  }

  const style: CSSProperties | undefined =
    stacked || shown == null ? undefined : { ["--ff-inbox-list-width" as string]: `${shown}px` };

  return (
    <div
      ref={setFrame}
      className={dragging ? "ff-inbox-split is-resizing" : "ff-inbox-split"}
      data-ff-inbox-split=""
      style={style}
    >
      <div className="ff-inbox-list-pane">{list}</div>
      {detail ? (
        <>
          <div
            className="ff-inbox-splitter"
            data-ff-inbox-splitter=""
            data-dragging={dragging ? "true" : "false"}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize thread list"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={shown ?? INBOX_LIST_WIDTH_DEFAULT}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onKeyDown={onKeyDown}
            onDoubleClick={onDoubleClick}
          />
          <div className="ff-inbox-detail-pane">{detail}</div>
        </>
      ) : null}
    </div>
  );
}
