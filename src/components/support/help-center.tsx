"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleHelp, Play } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSupport } from "@/components/support/support-context";
import {
  HELP_ARTICLES,
  HELP_FAQ,
  HELP_VIDEOS,
  articleById,
  parseSupportQuery,
  type HelpTab,
} from "@/lib/help/content";
import { cn } from "@/lib/utils";

const TABS: { id: HelpTab; label: string }[] = [
  { id: "howto", label: "How-to" },
  { id: "faq", label: "Q&A" },
  { id: "videos", label: "Videos" },
];

function useSoftphoneCollision() {
  const [left, setLeft] = useState(false);

  useEffect(() => {
    function check() {
      const phone = document.getElementById("desk-softphone");
      if (!phone) {
        setLeft(false);
        return;
      }
      const rect = phone.getBoundingClientRect();
      const overlapsRight =
        rect.bottom > window.innerHeight - 96 && rect.right > window.innerWidth - 180;
      setLeft(overlapsRight);
    }
    check();
    window.addEventListener("resize", check);
    const timer = window.setInterval(check, 1500);
    return () => {
      window.removeEventListener("resize", check);
      window.clearInterval(timer);
    };
  }, []);

  return left;
}

export function SupportLauncher() {
  const { open, tab, articleId, openSupport, closeSupport, setTab, setArticleId } = useSupport();
  const flipLeft = useSoftphoneCollision();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [faqOpen, setFaqOpen] = useState(HELP_FAQ[0]?.id ?? "");

  useEffect(() => {
    const parsed = parseSupportQuery(search.get("support"));
    if (!parsed) return;
    openSupport(parsed);
  }, [search, openSupport]);

  function handleOpenChange(next: boolean) {
    if (next) {
      openSupport();
      return;
    }
    closeSupport();
    if (search.get("support")) {
      const params = new URLSearchParams(search.toString());
      params.delete("support");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }

  const article = articleId ? articleById(articleId) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => openSupport()}
        className={cn(
          "fixed bottom-5 z-40 inline-flex h-11 items-center gap-2 rounded-full bg-navy px-4 text-sm font-semibold text-white shadow-lg hover:bg-navy-mid",
          flipLeft ? "left-5" : "right-5",
        )}
      >
        <CircleHelp className="size-5" />
        Support
      </button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Help center</SheetTitle>
            <SheetDescription>
              Short answers for this Florida P&amp;C desk. Videos are titles only for now.
            </SheetDescription>
          </SheetHeader>

          <div className="flex gap-1 border-b border-border px-4 py-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  if (item.id !== "howto") setArticleId(null);
                }}
                className={cn(
                  "h-8 rounded-md px-2.5 text-xs font-medium",
                  tab === item.id ? "bg-navy text-white" : "text-navy hover:bg-muted",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "howto" ? (
              article ? (
                <article>
                  <button
                    type="button"
                    onClick={() => setArticleId(null)}
                    className="mb-2 text-xs text-primary hover:underline"
                  >
                    All how-to
                  </button>
                  <h3 className="text-base font-semibold text-navy">{article.title}</h3>
                  <p className="mt-1 text-base text-muted-foreground">{article.summary}</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-base">
                    {article.body.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </article>
              ) : (
                <ul className="space-y-2">
                  {HELP_ARTICLES.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => setArticleId(row.id)}
                        className="w-full rounded-md border border-border bg-card px-3 py-2 text-left hover:bg-muted"
                      >
                        <div className="text-sm font-medium text-navy">{row.title}</div>
                        <div className="text-base text-muted-foreground">{row.summary}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : null}

            {tab === "faq" ? (
              <div className="space-y-2">
                {HELP_FAQ.map((row) => {
                  const openRow = faqOpen === row.id;
                  return (
                    <div key={row.id} className="rounded-md border border-border">
                      <button
                        type="button"
                        aria-expanded={openRow}
                        onClick={() => setFaqOpen(row.id)}
                        className="flex w-full px-3 py-2 text-left text-sm font-medium text-navy"
                      >
                        {row.q}
                      </button>
                      {openRow ? (
                        <p className="border-t border-border px-3 py-2 text-base text-muted-foreground">
                          {row.a}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {tab === "videos" ? (
              <ul className="space-y-2">
                {HELP_VIDEOS.map((video) => (
                  <li key={video.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setTab("howto");
                        setArticleId(video.articleId);
                      }}
                      className="flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-left hover:bg-muted"
                    >
                      <span className="inline-flex size-10 items-center justify-center rounded-md bg-navy text-white">
                        <Play className="size-4 fill-current" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-navy">{video.title}</span>
                        <span className="text-base text-muted-foreground">
                          Short video placeholder · opens the how-to
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
