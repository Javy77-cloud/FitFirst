import { describe, expect, it } from "vitest";
import { normalizeVideoProposalUrl, videoProposalHost } from "./video-proposal";

describe("video proposal URL stub", () => {
  it("accepts an https record/upload link", () => {
    expect(normalizeVideoProposalUrl("https://fitfirst.example/video/ruiz-melbourne-ho3")).toBe(
      "https://fitfirst.example/video/ruiz-melbourne-ho3",
    );
    expect(videoProposalHost("https://www.youtube.com/watch?v=demo")).toBe("youtube.com");
  });

  it("rejects empty, javascript, and non-http values", () => {
    expect(normalizeVideoProposalUrl("")).toBeNull();
    expect(normalizeVideoProposalUrl("loom-not-an-api")).toBeNull();
    expect(normalizeVideoProposalUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeVideoProposalUrl("ftp://files.example/walkthrough")).toBeNull();
  });
});
