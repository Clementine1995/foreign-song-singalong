import { describe, expect, it } from "vitest";
import { parseLyrics } from "../input/parseLyrics.js";
import {
  applyReferenceRomajiOverrides,
  compareReferenceRomaji,
  compareRomajiText,
  createRomajiCorrectionDraft,
  normalizeRomajiForComparison,
  toReferenceRomajiMarkdown
} from "./compareReferenceRomaji.js";

describe("compareReferenceRomaji", () => {
  it("reports exact, format-only, and reading differences", async () => {
    const parsed = parseLyrics("きっと\nありがとう\n忘れない");
    const report = await compareReferenceRomaji(parsed.lines, "kitto\nA RI GA TO U\nwasuremasen");

    expect(report.summary).toMatchObject({
      exact_match: 1,
      format_difference: 1,
      reading_mismatch: 1
    });
    expect(report.lines.map((line) => line.status)).toEqual([
      "exact_match",
      "format_difference",
      "reading_mismatch"
    ]);
    expect(report.lines[2]).toMatchObject({
      original: "忘れない",
      generatedRomaji: "wasure nai",
      referenceRomaji: "wasuremasen",
      suggestedManualRomaji: "wasuremasen"
    });
  });

  it("reports missing and extra reference lines", async () => {
    const parsed = parseLyrics("きっと");
    const missing = await compareReferenceRomaji(parsed.lines, "");
    const extra = await compareReferenceRomaji(parsed.lines, "kitto\narigatou");

    expect(missing.lines[0].status).toBe("missing_reference");
    expect(extra.lines[1]).toMatchObject({
      referenceRomaji: "arigatou",
      status: "extra_reference"
    });
  });

  it("normalizes case, punctuation, spacing, and apostrophes", () => {
    expect(normalizeRomajiForComparison("N'da, YO!")).toBe("ndayo");
    expect(compareRomajiText("n'da yo", "NDA YO")).toBe("format_difference");
  });

  it("renders a markdown report", async () => {
    const parsed = parseLyrics("きっと");
    const report = await compareReferenceRomaji(parsed.lines, "kitto");
    const markdown = toReferenceRomajiMarkdown(report);

    expect(markdown).toContain("# Reference Romaji Comparison");
    expect(markdown).toContain("- Exact match: 1");
    expect(markdown).toContain("### line-001: exact match");
    expect(markdown).toContain("原文：きっと");
    expect(markdown).toContain("Kana：きっと");
  });

  it("renders actionable mismatch details in markdown", async () => {
    const parsed = parseLyrics("忘れない");
    const report = await compareReferenceRomaji(parsed.lines, "wasuremasen");
    const markdown = toReferenceRomajiMarkdown(report);

    expect(markdown).toContain("Kana：わすれない");
    expect(markdown).toContain("Generated romaji：wasure nai");
    expect(markdown).toContain("Reference romaji：wasuremasen");
    expect(markdown).toContain("Review reasons：unknown_kanji_reading");
    expect(markdown).toContain("Suggested action：Review kana/reading manually");
  });

  it("creates a correction draft for actionable romaji differences", async () => {
    const parsed = parseLyrics("ありがとう\n忘れない\nきっと");
    const report = await compareReferenceRomaji(parsed.lines, "A RI GA TO U\nwasuremasen\nkitto");
    const draft = createRomajiCorrectionDraft(report, {
      projectFile: "song.json",
      referenceFile: "reference.txt"
    });

    expect(draft).toMatchObject({
      version: 1,
      type: "romaji_correction_draft",
      source: {
        projectFile: "song.json",
        referenceFile: "reference.txt"
      }
    });
    expect(draft.corrections).toHaveLength(2);
    expect(draft.corrections[0]).toMatchObject({
      lineId: "line-001",
      original: "ありがとう",
      currentKana: "ありがとう",
      currentRomaji: "arigatou",
      referenceRomaji: "A RI GA TO U",
      suggestedRomaji: "A RI GA TO U",
      suggestedKana: null,
      status: "format_difference"
    });
    expect(draft.corrections[1]).toMatchObject({
      lineId: "line-002",
      original: "忘れない",
      reviewReasons: ["unknown_kanji_reading"],
      status: "reading_mismatch"
    });
  });

  it("applies reference romaji as manual overrides without overwriting existing manual romaji", async () => {
    const parsed = parseLyrics("ありがとう\n忘れない");
    const report = await compareReferenceRomaji(parsed.lines, "A RI GA TO U\nwasuremasen");
    const project = {
      version: 1 as const,
      language: "ja" as const,
      source: { type: "user_paste" as const },
      settings: {
        pronunciationMode: "zh_assist" as const,
        romajiStyle: "singing_friendly" as const
      },
      lines: report.lines.map((line) => ({
        id: line.lyricLineId ?? "line-unknown",
        index: line.index,
        original: line.original ?? "",
        romaji: line.generatedRomaji,
        difficultyNotes: [],
        needsReview: false,
        reviewReasons: [],
        manualOverrides: {
          reading: null,
          kana: null,
          romaji: line.index === 1 ? "keep-me" : null,
          zhAssist: null,
          notes: []
        }
      }))
    };

    const result = applyReferenceRomajiOverrides(project, "A RI GA TO U\nwasuremasen");

    expect(result.appliedCount).toBe(1);
    expect(result.preservedCount).toBe(1);
    expect(result.project.lines[0].manualOverrides.romaji).toBe("A RI GA TO U");
    expect(result.project.lines[1].manualOverrides.romaji).toBe("keep-me");
  });
});
