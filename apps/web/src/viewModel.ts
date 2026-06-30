import type { AnnotationLine, AnnotationProject } from "@singbridge/core";
import type { ReviewDecision, ReviewDecisionMap, RomajiCorrectionDraft, ViewerTab } from "./types";

export type OverlayStatus = "format_difference" | "reading_mismatch";

export type ReviewGuidanceLevel = "low" | "needs_manual_review";

export interface ReviewGuidance {
  level: ReviewGuidanceLevel;
  label: string;
  title: string;
  action: string;
  detail: string;
}

export interface CorrectionOverlay {
  lineId: string;
  currentKana?: string;
  currentRomaji?: string;
  referenceRomaji: string;
  suggestedRomaji: string;
  suggestedKana: null;
  status: OverlayStatus;
  reviewReasons: string[];
  note: string;
  guidance: ReviewGuidance;
}

export interface ViewerLine {
  line: AnnotationLine;
  overlay?: CorrectionOverlay;
  reviewDecision: ReviewDecision;
}

export type TextOverrideInputMap = Record<string, string>;

export interface ManualOverrideInputMaps {
  romaji: TextOverrideInputMap;
  zhAssist: TextOverrideInputMap;
}

export interface ReviewDecisionExport {
  version: 1;
  type: "romaji_review_decisions";
  source: {
    projectName: string;
    draftName?: string;
    exportedAt: string;
  };
  decisions: ReviewDecisionExportItem[];
}

export interface ReviewDecisionExportItem {
  lineId: string;
  index: number;
  original: string;
  decision: ReviewDecision;
  correctionStatus: OverlayStatus;
  currentRomaji?: string;
  suggestedRomaji: string;
  suggestedKana: null;
  note: string;
}

export function buildOverlayMap(draft: RomajiCorrectionDraft): Map<string, CorrectionOverlay> {
  return new Map(draft.corrections.map((correction) => [
    correction.lineId,
    {
      lineId: correction.lineId,
      currentKana: correction.currentKana,
      currentRomaji: correction.currentRomaji,
      referenceRomaji: correction.referenceRomaji,
      suggestedRomaji: correction.suggestedRomaji,
      suggestedKana: correction.suggestedKana,
      status: correction.status,
      reviewReasons: correction.reviewReasons,
      note: correction.note,
      guidance: buildReviewGuidance(correction.status, correction.reviewReasons)
    }
  ]));
}

export function buildReviewGuidance(status: OverlayStatus, reviewReasons: string[]): ReviewGuidance {
  if (status === "format_difference") {
    return {
      level: "low",
      label: "低风险",
      title: "格式差异",
      action: "通常可以接受建议 romaji。",
      detail: "系统判断读音归一化后一致，差异主要来自大小写、空格或标点风格。"
    };
  }

  const hasUnknownReading = reviewReasons.includes("unknown_kanji_reading");
  return {
    level: "needs_manual_review",
    label: "需人工确认",
    title: hasUnknownReading ? "可能是汉字读音差异" : "读音不一致",
    action: "建议保持待处理或忽略；确认 kana 后再接受。",
    detail: hasUnknownReading
      ? "这一行包含需要复核的汉字读音。只接受 romaji 不会修正 kana。"
      : "参考 romaji 和当前生成结果读音不同。接受前请确认这不是错误读法。"
  };
}

export function createViewerLines(
  lines: AnnotationLine[],
  draft: RomajiCorrectionDraft,
  decisions: ReviewDecisionMap = {}
): ViewerLine[] {
  const overlays = buildOverlayMap(draft);
  return lines.map((line) => ({
    line,
    overlay: overlays.get(line.id),
    reviewDecision: decisions[line.id] ?? "pending"
  }));
}

export function buildManualOverrideInputs(lines: AnnotationLine[]): ManualOverrideInputMaps {
  return {
    romaji: Object.fromEntries(lines.map((line) => [line.id, line.manualOverrides.romaji ?? ""])),
    zhAssist: Object.fromEntries(lines.map((line) => [line.id, line.manualOverrides.zhAssist ?? ""]))
  };
}

export function buildAnnotationProjectWithManualOverrides(
  project: AnnotationProject,
  overrides: ManualOverrideInputMaps
): AnnotationProject {
  return {
    ...project,
    lines: project.lines.map((line) => {
      const nextRomaji = overrides.romaji[line.id];
      const nextZhAssist = overrides.zhAssist[line.id];
      if (nextRomaji === undefined && nextZhAssist === undefined) {
        return line;
      }

      return {
        ...line,
        manualOverrides: {
          ...line.manualOverrides,
          ...(nextRomaji !== undefined ? { romaji: textOverrideOrNull(nextRomaji) } : {}),
          ...(nextZhAssist !== undefined ? { zhAssist: textOverrideOrNull(nextZhAssist) } : {})
        }
      };
    })
  };
}

function textOverrideOrNull(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

export function sanitizeManualOverrideInputs(value: unknown, base: ManualOverrideInputMaps): ManualOverrideInputMaps {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return base;
  }

  const candidate = value as Partial<Record<keyof ManualOverrideInputMaps, unknown>>;
  return {
    romaji: sanitizeTextOverrideInputMap(candidate.romaji, base.romaji),
    zhAssist: sanitizeTextOverrideInputMap(candidate.zhAssist, base.zhAssist)
  };
}

function sanitizeTextOverrideInputMap(value: unknown, base: TextOverrideInputMap): TextOverrideInputMap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return base;
  }

  return Object.fromEntries(Object.keys(base).map((lineId) => {
    const saved = (value as Record<string, unknown>)[lineId];
    return [lineId, typeof saved === "string" ? saved : base[lineId]];
  }));
}

export function filterViewerLines(lines: ViewerLine[], tab: ViewerTab): ViewerLine[] {
  if (tab === "review") {
    return lines.filter((item) => item.line.needsReview || item.line.reviewReasons.length > 0);
  }

  if (tab === "corrections") {
    return lines.filter((item) => item.overlay !== undefined);
  }

  if (tab === "low_risk") {
    return lines.filter((item) => item.overlay?.guidance.level === "low");
  }

  if (tab === "manual_review") {
    return lines.filter((item) => item.overlay?.guidance.level === "needs_manual_review");
  }

  if (tab === "pending") {
    return lines.filter((item) => item.overlay !== undefined && item.reviewDecision === "pending");
  }

  if (tab === "accepted") {
    return lines.filter((item) => item.overlay !== undefined && item.reviewDecision === "accepted");
  }

  if (tab === "ignored") {
    return lines.filter((item) => item.overlay !== undefined && item.reviewDecision === "ignored");
  }

  return lines;
}

export function buildReviewDecisionExport(
  lines: ViewerLine[],
  source: { projectName: string; draftName?: string; exportedAt: string }
): ReviewDecisionExport {
  return {
    version: 1,
    type: "romaji_review_decisions",
    source,
    decisions: lines.flatMap((item) => {
      if (!item.overlay) {
        return [];
      }

      return [{
        lineId: item.line.id,
        index: item.line.index,
        original: item.line.original,
        decision: item.reviewDecision,
        correctionStatus: item.overlay.status,
        ...(item.overlay.currentRomaji !== undefined ? { currentRomaji: item.overlay.currentRomaji } : {}),
        suggestedRomaji: item.overlay.suggestedRomaji,
        suggestedKana: item.overlay.suggestedKana,
        note: item.overlay.note
      }];
    })
  };
}
