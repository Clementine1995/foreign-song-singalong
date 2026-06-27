import { describe, expect, it } from "vitest";
import { generateZhAssist } from "./zhAssist.js";

describe("generateZhAssist", () => {
  it("generates hybrid chunks for kana lines", () => {
    expect(generateZhAssist("きっと")).toBe("ki t-to");
    expect(generateZhAssist("ありがとう")).toBe("a li/ri ga to-o");
    expect(generateZhAssist("いい")).toBe("i-i");
  });

  it("keeps difficult sounds visible instead of forcing Mandarin pinyin", () => {
    expect(generateZhAssist("つふれ")).toBe("tsu fu le/re");
  });

  it("handles youon and long marks", () => {
    expect(generateZhAssist("ちょっとコーヒー")).toBe("cho t-to ko-o hi-i");
  });

  it("handles common katakana foreign-sound combinations", () => {
    expect(generateZhAssist("ファイト、ティアラ")).toBe("fa i to、 ti a la/ra");
  });

  it("preserves parenthesized latin ad libs", () => {
    expect(generateZhAssist("きみも(Oh)")).toBe("ki mi mo (Oh)");
  });
});
