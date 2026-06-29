import type { AnnotationLine } from "@singbridge/core";
import type { ReviewDecision, ReviewDecisionMap, RomajiCorrectionDraft, ViewerTab } from "./types";

export type OverlayStatus = "format_difference" | "reading_mismatch";

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
}

export interface ViewerLine {
  line: AnnotationLine;
  overlay?: CorrectionOverlay;
  reviewDecision: ReviewDecision;
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
      note: correction.note
    }
  ]));
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

export function filterViewerLines(lines: ViewerLine[], tab: ViewerTab): ViewerLine[] {
  if (tab === "review") {
    return lines.filter((item) => item.line.needsReview || item.line.reviewReasons.length > 0);
  }

  if (tab === "corrections") {
    return lines.filter((item) => item.overlay !== undefined);
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
