import { describe, expect, it } from "vitest";
import { loadAnnotationProjectValue, loadCorrectionDraftValue } from "./localJsonLoad";
import { buildReviewDecisionExport, createViewerLines, filterViewerLines } from "./viewModel";
import projectFixture from "../public/fixtures/annotation-ja.json";
import draftFixture from "../public/fixtures/correction-draft.json";

describe("review workflow smoke", () => {
  it("loads local JSON, marks correction decisions, filters them, and exports decisions", () => {
    const loaded = loadAnnotationProjectValue(projectFixture, "song.json");
    const withDraft = loadCorrectionDraftValue(loaded, draftFixture, "corrections.json");
    const lines = createViewerLines(withDraft.project.lines, withDraft.draft, {
      "line-002": "accepted",
      "line-003": "ignored"
    });

    expect(filterViewerLines(lines, "corrections").map((item) => item.line.id)).toEqual(["line-002", "line-003"]);
    expect(filterViewerLines(lines, "pending")).toEqual([]);
    expect(filterViewerLines(lines, "accepted").map((item) => item.line.id)).toEqual(["line-002"]);
    expect(filterViewerLines(lines, "ignored").map((item) => item.line.id)).toEqual(["line-003"]);
    expect(lines.find((item) => item.line.id === "line-002")?.overlay?.guidance.level).toBe("needs_manual_review");
    expect(lines.find((item) => item.line.id === "line-003")?.overlay?.guidance.level).toBe("low");

    const exported = buildReviewDecisionExport(lines, {
      projectName: withDraft.projectName,
      draftName: withDraft.draftName,
      exportedAt: "2026-06-28T12:00:00.000Z"
    });

    expect(exported).toMatchObject({
      version: 1,
      type: "romaji_review_decisions",
      source: {
        projectName: "song.json",
        draftName: "corrections.json"
      },
      decisions: [
        {
          lineId: "line-002",
          decision: "accepted",
          suggestedRomaji: "wasuremasen",
          suggestedKana: null
        },
        {
          lineId: "line-003",
          decision: "ignored",
          suggestedRomaji: "a ri ga to u",
          suggestedKana: null
        }
      ]
    });
  });
});
