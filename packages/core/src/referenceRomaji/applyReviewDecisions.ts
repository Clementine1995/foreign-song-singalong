import type { AnnotationProject } from "../schema/annotation.js";

export type RomajiReviewDecision = "pending" | "accepted" | "ignored";

export interface RomajiReviewDecisionExport {
  version: 1;
  type: "romaji_review_decisions";
  source: {
    projectName: string;
    draftName?: string;
    exportedAt: string;
  };
  decisions: RomajiReviewDecisionItem[];
}

export interface RomajiReviewDecisionItem {
  lineId: string;
  index: number;
  original: string;
  decision: RomajiReviewDecision;
  correctionStatus: "format_difference" | "reading_mismatch";
  currentRomaji?: string;
  suggestedRomaji: string;
  suggestedKana: null;
  note: string;
}

export interface ApplyRomajiReviewDecisionsResult {
  project: AnnotationProject;
  appliedCount: number;
  ignoredCount: number;
  pendingCount: number;
  preservedCount: number;
  missingLineCount: number;
}

export function applyRomajiReviewDecisions(
  project: AnnotationProject,
  review: RomajiReviewDecisionExport
): ApplyRomajiReviewDecisionsResult {
  let appliedCount = 0;
  let ignoredCount = 0;
  let pendingCount = 0;
  let preservedCount = 0;
  let missingLineCount = 0;

  const acceptedByLineId = new Map<string, RomajiReviewDecisionItem>();

  for (const item of review.decisions) {
    if (item.decision === "ignored") {
      ignoredCount += 1;
      continue;
    }
    if (item.decision === "pending") {
      pendingCount += 1;
      continue;
    }
    acceptedByLineId.set(item.lineId, item);
  }

  const lines = project.lines.map((line) => {
    const accepted = acceptedByLineId.get(line.id);
    if (!accepted) {
      return line;
    }

    acceptedByLineId.delete(line.id);
    if (line.manualOverrides.romaji) {
      preservedCount += 1;
      return line;
    }

    appliedCount += 1;
    return {
      ...line,
      manualOverrides: {
        ...line.manualOverrides,
        romaji: accepted.suggestedRomaji
      }
    };
  });

  missingLineCount = acceptedByLineId.size;

  return {
    project: {
      ...project,
      lines
    },
    appliedCount,
    ignoredCount,
    pendingCount,
    preservedCount,
    missingLineCount
  };
}

export function parseRomajiReviewDecisionExport(value: unknown): RomajiReviewDecisionExport {
  if (!isRecord(value)) {
    throw new Error("review decisions JSON must be an object");
  }
  if (value.version !== 1) {
    throw new Error("version must be 1");
  }
  if (value.type !== "romaji_review_decisions") {
    throw new Error("type must be romaji_review_decisions");
  }
  if (!isRecord(value.source)) {
    throw new Error("source must be an object");
  }
  if (typeof value.source.projectName !== "string" || value.source.projectName.length === 0) {
    throw new Error("source.projectName must be a non-empty string");
  }
  if (value.source.draftName !== undefined && typeof value.source.draftName !== "string") {
    throw new Error("source.draftName must be a string when present");
  }
  if (typeof value.source.exportedAt !== "string" || value.source.exportedAt.length === 0) {
    throw new Error("source.exportedAt must be a non-empty string");
  }
  if (!Array.isArray(value.decisions)) {
    throw new Error("decisions must be an array");
  }

  value.decisions.forEach((item, index) => {
    const path = `decisions[${index}]`;
    if (!isRecord(item)) {
      throw new Error(`${path} must be an object`);
    }
    if (typeof item.lineId !== "string" || item.lineId.length === 0) {
      throw new Error(`${path}.lineId must be a non-empty string`);
    }
    if (typeof item.index !== "number" || !Number.isInteger(item.index) || item.index < 0) {
      throw new Error(`${path}.index must be a non-negative integer`);
    }
    if (typeof item.original !== "string") {
      throw new Error(`${path}.original must be a string`);
    }
    if (item.decision !== "pending" && item.decision !== "accepted" && item.decision !== "ignored") {
      throw new Error(`${path}.decision must be pending, accepted, or ignored`);
    }
    if (item.correctionStatus !== "format_difference" && item.correctionStatus !== "reading_mismatch") {
      throw new Error(`${path}.correctionStatus must be format_difference or reading_mismatch`);
    }
    if (item.currentRomaji !== undefined && typeof item.currentRomaji !== "string") {
      throw new Error(`${path}.currentRomaji must be a string when present`);
    }
    if (typeof item.suggestedRomaji !== "string" || item.suggestedRomaji.length === 0) {
      throw new Error(`${path}.suggestedRomaji must be a non-empty string`);
    }
    if (item.suggestedKana !== null) {
      throw new Error(`${path}.suggestedKana must be null`);
    }
    if (typeof item.note !== "string") {
      throw new Error(`${path}.note must be a string`);
    }
  });

  return value as unknown as RomajiReviewDecisionExport;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
