import { describe, expect, it } from "vitest";
import { kanaToRomaji } from "./kanaToRomaji.js";

describe("kanaToRomaji", () => {
  it("handles common kana, sokuon, and youon", () => {
    expect(kanaToRomaji("きっと")).toBe("kitto");
    expect(kanaToRomaji("しゃしん")).toBe("shashin");
    expect(kanaToRomaji("ちょっと")).toBe("chotto");
  });

  it("keeps singing-friendly long vowels visible", () => {
    expect(kanaToRomaji("ありがとう")).toBe("arigatou");
    expect(kanaToRomaji("コーヒー")).toBe("koohii");
  });

  it("marks n before vowel-like sounds", () => {
    expect(kanaToRomaji("れんあい")).toBe("ren'ai");
  });

  it("handles common katakana foreign-sound combinations", () => {
    expect(kanaToRomaji("ファイト、ティアラ")).toBe("faito、tiara");
  });

  it("keeps the wo particle visible for singing references", () => {
    expect(kanaToRomaji("を")).toBe("wo");
  });
});
