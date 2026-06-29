import { describe, expect, it } from "vitest";
import { buildReviewDecisionExport, createViewerLines, filterViewerLines } from "./viewModel";
import projectFixture from "../public/fixtures/annotation-ja.json";
import draftFixture from "../public/fixtures/correction-draft.json";
import type { AnnotationProject, RomajiCorrectionDraft } from "./types";

const project = projectFixture as AnnotationProject;
const draft = draftFixture as RomajiCorrectionDraft;

describe("viewer model", () => {
  it("overlays correction drafts by line id", () => {
    const lines = createViewerLines(project.lines, draft);

    expect(lines).toHaveLength(4);
    expect(lines[1].overlay).toMatchObject({
      currentKana: "わすれない",
      currentRomaji: "wasure nai",
      referenceRomaji: "wasuremasen",
      status: "reading_mismatch",
      suggestedRomaji: "wasuremasen",
      suggestedKana: null,
      reviewReasons: ["unknown_kanji_reading"]
    });
  });

  it("filters review and correction lines", () => {
    const lines = createViewerLines(project.lines, draft);

    expect(filterViewerLines(lines, "all")).toHaveLength(4);
    expect(filterViewerLines(lines, "review").map((item) => item.line.id)).toEqual(["line-002", "line-004"]);
    expect(filterViewerLines(lines, "corrections").map((item) => item.line.id)).toEqual(["line-002", "line-003"]);
  });

  it("tracks local review decisions and filters them", () => {
    const lines = createViewerLines(project.lines, draft, {
      "line-002": "accepted",
      "line-003": "ignored"
    });

    expect(filterViewerLines(lines, "pending")).toEqual([]);
    expect(filterViewerLines(lines, "accepted").map((item) => item.line.id)).toEqual(["line-002"]);
    expect(filterViewerLines(lines, "ignored").map((item) => item.line.id)).toEqual(["line-003"]);
  });

  it("exports correction review decisions without changing the song json", () => {
    const lines = createViewerLines(project.lines, draft, {
      "line-002": "accepted"
    });

    expect(buildReviewDecisionExport(lines, {
      projectName: "song.json",
      draftName: "corrections.json",
      exportedAt: "2026-06-28T00:00:00.000Z"
    })).toMatchObject({
      version: 1,
      type: "romaji_review_decisions",
      source: {
        projectName: "song.json",
        draftName: "corrections.json",
        exportedAt: "2026-06-28T00:00:00.000Z"
      },
      decisions: [
        {
          lineId: "line-002",
          decision: "accepted",
          correctionStatus: "reading_mismatch",
          suggestedRomaji: "wasuremasen",
          suggestedKana: null
        },
        {
          lineId: "line-003",
          decision: "pending",
          correctionStatus: "format_difference",
          suggestedKana: null
        }
      ]
    });
  });
});
