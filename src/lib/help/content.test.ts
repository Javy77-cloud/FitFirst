import { describe, expect, it } from "vitest";
import { HELP_ARTICLES, HELP_FAQ, HELP_VIDEOS, parseSupportQuery } from "./content";

describe("desk help seed", () => {
  it("covers the four video titles and keeps FAQ short", () => {
    expect(HELP_VIDEOS.map((video) => video.title)).toEqual([
      "Quote Sheet",
      "Bind vs Quote",
      "Calendar",
      "Start Shop",
    ]);
    for (const row of HELP_FAQ) {
      expect(row.a.length).toBeLessThan(220);
    }
    expect(HELP_ARTICLES.some((article) => /321,000/.test(article.body.join(" ")))).toBe(true);
    expect(HELP_FAQ.find((row) => row.id === "ana")?.a).toMatch(/Do not bind|Unbound|321,000/i);
  });

  it("deep-links query values onto a tab or article", () => {
    expect(parseSupportQuery("faq")?.tab).toBe("faq");
    expect(parseSupportQuery("start-shop")).toEqual({ tab: "howto", articleId: "start-shop" });
    expect(parseSupportQuery("1")?.tab).toBe("howto");
  });
});
