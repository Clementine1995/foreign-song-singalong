import { describe, expect, it } from "vitest";
import { createViewerLines, filterViewerLines } from "./viewModel";
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
});
