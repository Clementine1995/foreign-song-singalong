import { describe, expect, it } from "vitest";
import {
  buildAnnotationProjectWithManualOverrides,
  buildManualOverrideInputs,
  buildReviewDecisionExport,
  buildReviewGuidance,
  createViewerLines,
  filterViewerLines,
  sanitizeManualOverrideInputs
} from "./viewModel";
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
      reviewReasons: ["unknown_kanji_reading"],
      guidance: {
        level: "needs_manual_review",
        label: "需人工确认",
        action: "建议保持待处理或忽略；确认 kana 后再接受。"
      }
    });
  });

  it("classifies review guidance by correction risk", () => {
    expect(buildReviewGuidance("format_difference", [])).toMatchObject({
      level: "low",
      label: "低风险",
      action: "通常可以接受建议 romaji。"
    });
    expect(buildReviewGuidance("reading_mismatch", ["unknown_kanji_reading"])).toMatchObject({
      level: "needs_manual_review",
      label: "需人工确认",
      title: "可能是汉字读音差异"
    });
  });

  it("filters review and correction lines", () => {
    const lines = createViewerLines(project.lines, draft);

    expect(filterViewerLines(lines, "all")).toHaveLength(4);
    expect(filterViewerLines(lines, "review").map((item) => item.line.id)).toEqual(["line-002", "line-004"]);
    expect(filterViewerLines(lines, "corrections").map((item) => item.line.id)).toEqual(["line-002", "line-003"]);
    expect(filterViewerLines(lines, "low_risk").map((item) => item.line.id)).toEqual(["line-003"]);
    expect(filterViewerLines(lines, "manual_review").map((item) => item.line.id)).toEqual(["line-002"]);
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

  it("builds editable text overrides without changing generated fields", () => {
    const inputs = buildManualOverrideInputs(project.lines);
    const edited = buildAnnotationProjectWithManualOverrides(project, {
      romaji: {
        ...inputs.romaji,
        "line-001": "  edited romaji  ",
        "line-002": ""
      },
      zhAssist: {
        ...inputs.zhAssist,
        "line-001": "  edited zh assist  ",
        "line-003": ""
      }
    });

    expect(project.lines[0].manualOverrides.romaji).toBeNull();
    expect(edited.lines[0].romaji).toBe(project.lines[0].romaji);
    expect(edited.lines[0].zhAssist).toBe(project.lines[0].zhAssist);
    expect(edited.lines[0].manualOverrides.romaji).toBe("edited romaji");
    expect(edited.lines[0].manualOverrides.zhAssist).toBe("edited zh assist");
    expect(edited.lines[1].manualOverrides.romaji).toBeNull();
    expect(edited.lines[2].manualOverrides.zhAssist).toBeNull();
  });

  it("sanitizes saved text override drafts by known line ids", () => {
    const base = buildManualOverrideInputs(project.lines);

    expect(sanitizeManualOverrideInputs({
      romaji: {
        "line-001": "saved romaji",
        "line-999": "stale"
      },
      zhAssist: {
        "line-003": "saved zh",
        "line-004": 42
      }
    }, base)).toMatchObject({
      romaji: {
        "line-001": "saved romaji",
        "line-002": "",
        "line-003": "",
        "line-004": ""
      },
      zhAssist: {
        "line-001": "",
        "line-002": "",
        "line-003": "saved zh",
        "line-004": ""
      }
    });

    expect(sanitizeManualOverrideInputs([], base)).toBe(base);
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
