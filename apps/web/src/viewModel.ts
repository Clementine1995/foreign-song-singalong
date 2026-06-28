import type { AnnotationLine } from "@singbridge/core";
import type { RomajiCorrectionDraft, ViewerTab } from "./types";

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

export function createViewerLines(lines: AnnotationLine[], draft: RomajiCorrectionDraft): ViewerLine[] {
  const overlays = buildOverlayMap(draft);
  return lines.map((line) => ({
    line,
    overlay: overlays.get(line.id)
  }));
}

export function filterViewerLines(lines: ViewerLine[], tab: ViewerTab): ViewerLine[] {
  if (tab === "review") {
    return lines.filter((item) => item.line.needsReview || item.line.reviewReasons.length > 0);
  }

  if (tab === "corrections") {
    return lines.filter((item) => item.overlay !== undefined);
  }

  return lines;
}
