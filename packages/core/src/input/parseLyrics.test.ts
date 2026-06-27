import { describe, expect, it } from "vitest";
import { parseLyrics } from "./parseLyrics.js";

describe("parseLyrics", () => {
  it("splits plain lyrics and preserves blank lines", () => {
    const result = parseLyrics("きっと忘れない\n\nありがとう");

    expect(result.lines).toEqual([
      { id: "line-001", index: 0, original: "きっと忘れない" },
      { id: "line-002", index: 1, original: "" },
      { id: "line-003", index: 2, original: "ありがとう" }
    ]);
  });

  it("parses simple LRC-like timestamps", () => {
    const result = parseLyrics("[00:12.30]きっと忘れない");

    expect(result.lines[0]).toEqual({
      id: "line-001",
      index: 0,
      timestamp: "00:12.30",
      original: "きっと忘れない"
    });
  });

  it("strips a UTF-8 BOM from the first line", () => {
    const result = parseLyrics("\uFEFFきっと");

    expect(result.lines[0].original).toBe("きっと");
  });

  it("does not create an extra lyric line for a trailing newline", () => {
    const result = parseLyrics("きっと\nありがとう\n");

    expect(result.lines.map((line) => line.original)).toEqual(["きっと", "ありがとう"]);
  });

  it("rejects empty input", () => {
    expect(() => parseLyrics(" \n\t ")).toThrow("input is empty");
  });
});
