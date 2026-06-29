import { describe, expect, it } from "vitest";
import type { AnnotationProject } from "../schema/annotation.js";
import {
  applyRomajiReviewDecisions,
  parseRomajiReviewDecisionExport,
  type RomajiReviewDecisionExport
} from "./applyReviewDecisions.js";

const project: AnnotationProject = {
  version: 1,
  language: "ja",
  source: { type: "user_paste" },
  settings: {
    pronunciationMode: "zh_assist",
    romajiStyle: "singing_friendly"
  },
  lines: [
    line("line-001", 0, "きっと忘れない", null),
    line("line-002", 1, "ありがとう", null),
    line("line-003", 2, "響めき", "keep-me")
  ]
};

describe("applyRomajiReviewDecisions", () => {
  it("applies only accepted suggested romaji decisions", () => {
    const result = applyRomajiReviewDecisions(project, review({
      decisions: [
        decision("line-001", 0, "accepted", "wasuremasen"),
        decision("line-002", 1, "ignored", "A RI GA TO U"),
        decision("line-404", 3, "accepted", "missing")
      ]
    }));

    expect(result.appliedCount).toBe(1);
    expect(result.ignoredCount).toBe(1);
    expect(result.pendingCount).toBe(0);
    expect(result.preservedCount).toBe(0);
    expect(result.missingLineCount).toBe(1);
    expect(result.project.lines[0].manualOverrides.romaji).toBe("wasuremasen");
    expect(result.project.lines[0].manualOverrides.kana).toBeNull();
    expect(result.project.lines[1].manualOverrides.romaji).toBeNull();
  });

  it("preserves existing manual romaji overrides and counts pending decisions", () => {
    const result = applyRomajiReviewDecisions(project, review({
      decisions: [
        decision("line-002", 1, "pending", "A RI GA TO U"),
        decision("line-003", 2, "accepted", "doyomeki")
      ]
    }));

    expect(result.appliedCount).toBe(0);
    expect(result.pendingCount).toBe(1);
    expect(result.preservedCount).toBe(1);
    expect(result.project.lines[2].manualOverrides.romaji).toBe("keep-me");
  });
});

describe("parseRomajiReviewDecisionExport", () => {
  it("accepts valid review decisions", () => {
    expect(parseRomajiReviewDecisionExport(review({})).decisions).toHaveLength(2);
  });

  it("rejects invalid review decisions", () => {
    expect(() => parseRomajiReviewDecisionExport({
      version: 1,
      type: "romaji_review_decisions",
      source: { projectName: "song.json", exportedAt: "2026-06-28T12:00:00.000Z" },
      decisions: [
        {
          lineId: "line-001",
          index: 0,
          original: "きっと",
          decision: "accepted",
          correctionStatus: "format_difference",
          suggestedRomaji: "kitto",
          suggestedKana: "きっと",
          note: ""
        }
      ]
    })).toThrow("suggestedKana must be null");
  });
});

function line(id: string, index: number, original: string, manualRomaji: string | null): AnnotationProject["lines"][number] {
  return {
    id,
    index,
    original,
    romaji: "",
    difficultyNotes: [],
    needsReview: false,
    reviewReasons: [],
    manualOverrides: {
      reading: null,
      kana: null,
      romaji: manualRomaji,
      zhAssist: null,
      notes: []
    }
  };
}

function review(overrides: Partial<RomajiReviewDecisionExport>): RomajiReviewDecisionExport {
  return {
    version: 1,
    type: "romaji_review_decisions",
    source: {
      projectName: "song.json",
      draftName: "corrections.json",
      exportedAt: "2026-06-28T12:00:00.000Z"
    },
    decisions: [
      decision("line-001", 0, "accepted", "wasuremasen"),
      decision("line-002", 1, "ignored", "A RI GA TO U")
    ],
    ...overrides
  };
}

function decision(
  lineId: string,
  index: number,
  value: "pending" | "accepted" | "ignored",
  suggestedRomaji: string
): RomajiReviewDecisionExport["decisions"][number] {
  return {
    lineId,
    index,
    original: lineId,
    decision: value,
    correctionStatus: value === "accepted" ? "reading_mismatch" : "format_difference",
    currentRomaji: "",
    suggestedRomaji,
    suggestedKana: null,
    note: ""
  };
}
