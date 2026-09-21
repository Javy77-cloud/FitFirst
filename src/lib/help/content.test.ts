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
    expect(HELP_FAQ.find((row) => row.id === "ana")?.a).toMatch(/bind/i);
    const calendarHelp = HELP_ARTICLES.find((article) => article.id === "calendar")?.body.join(" ") ?? "";
    expect(calendarHelp).toMatch(/Add event \/ Add company meeting \/ Add training/);
    expect(calendarHelp).toMatch(/Month \/ Week \/ Day/);
    expect(calendarHelp).toMatch(/Task \/ Meeting \/ Call \/ Email \/ SMS/);
    expect(calendarHelp).toMatch(/titled Google/);
    expect(HELP_FAQ.find((row) => row.id === "calendar-sync")?.a).toMatch(/titled Google/);
  });

  it("deep-links query values onto a tab or article", () => {
    expect(parseSupportQuery("faq")?.tab).toBe("faq");
    expect(parseSupportQuery("start-shop")).toEqual({ tab: "howto", articleId: "start-shop" });
    expect(parseSupportQuery("1")?.tab).toBe("howto");
  });
});
