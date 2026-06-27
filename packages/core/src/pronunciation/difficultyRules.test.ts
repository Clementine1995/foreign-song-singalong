import { describe, expect, it } from "vitest";
import { detectDifficultyNotes } from "./difficultyRules.js";

describe("detectDifficultyNotes", () => {
  it("detects timing-sensitive kana", () => {
    const notes = detectDifficultyNotes("ちょっととう");

    expect(notes.map((note) => note.type)).toEqual([
      "youon",
      "shi_chi_ji",
      "sokuon",
      "long_vowel"
    ]);
  });

  it("detects Chinese-user difficult sounds", () => {
    const notes = detectDifficultyNotes("つふれん");

    expect(notes.map((note) => note.type)).toEqual(["tsu", "fu", "ra_row", "nasal_n"]);
    expect(notes.find((note) => note.type === "tsu")?.message).toContain("不要直接读成中文拼音 ci");
  });

  it("deduplicates repeated line-level reminders", () => {
    const notes = detectDifficultyNotes("ちょっとまって");

    expect(notes.filter((note) => note.type === "sokuon")).toHaveLength(1);
  });
});
