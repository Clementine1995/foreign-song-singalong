import { createAnnotationProjectWithReading } from "../annotation/createAnnotation.js";
import type { ParsedLyricLine } from "../input/parseLyrics.js";
import type { AnnotationProject, ReviewReason } from "../schema/annotation.js";
import { getEffectiveLine } from "../export/effectiveLine.js";

export type RomajiComparisonStatus =
  | "exact_match"
  | "format_difference"
  | "reading_mismatch"
  | "missing_reference"
  | "extra_reference";

export interface RomajiComparisonLine {
  index: number;
  lyricLineId?: string;
  original?: string;
  currentKana?: string;
  generatedRomaji?: string;
  referenceRomaji?: string;
  status: RomajiComparisonStatus;
  needsReview?: boolean;
  reviewReasons?: ReviewReason[];
  suggestedManualRomaji?: string;
  suggestedAction?: string;
}

export interface RomajiComparisonReport {
  lines: RomajiComparisonLine[];
  summary: Record<RomajiComparisonStatus, number>;
}

export interface RomajiCorrectionDraft {
  version: 1;
  type: "romaji_correction_draft";
  source: {
    projectFile?: string;
    referenceFile?: string;
    note: string;
  };
  corrections: RomajiCorrectionItem[];
}

export interface RomajiCorrectionItem {
  lineId: string;
  index: number;
  original: string;
  currentKana?: string;
  currentRomaji?: string;
  referenceRomaji: string;
  suggestedRomaji: string;
  suggestedKana: null;
  status: Extract<RomajiComparisonStatus, "format_difference" | "reading_mismatch">;
  reviewReasons: ReviewReason[];
  note: string;
}

export interface ApplyReferenceRomajiResult {
  project: AnnotationProject;
  report: RomajiComparisonReport;
  appliedCount: number;
  preservedCount: number;
}

export async function compareReferenceRomaji(
  lyricLines: ParsedLyricLine[],
  referenceInput: string
): Promise<RomajiComparisonReport> {
  const project = await createAnnotationProjectWithReading(lyricLines);
  return compareProjectReferenceRomaji(project, referenceInput);
}

export function compareProjectReferenceRomaji(
  project: AnnotationProject,
  referenceInput: string
): RomajiComparisonReport {
  const referenceLines = splitReferenceLines(referenceInput);
  const maxLength = Math.max(project.lines.length, referenceLines.length);
  const lines: RomajiComparisonLine[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const generated = project.lines[index];
    const referenceRomaji = referenceLines[index];

    if (!generated) {
      lines.push({
        index,
        referenceRomaji,
        status: "extra_reference"
      });
      continue;
    }

    const effective = getEffectiveLine(generated);
    const currentKana = effective.kana;
    const generatedRomaji = effective.romaji ?? "";
    const status = compareRomajiText(generatedRomaji, referenceRomaji);
    lines.push({
      index,
      lyricLineId: generated.id,
      original: generated.original,
      ...(currentKana !== undefined ? { currentKana } : {}),
      generatedRomaji,
      referenceRomaji,
      status,
      needsReview: generated.needsReview,
      reviewReasons: generated.reviewReasons,
      ...(shouldSuggestManualRomaji(status, referenceRomaji)
        ? {
            suggestedManualRomaji: referenceRomaji,
            suggestedAction: suggestedAction(status)
          }
        : {})
    });
  }

  return {
    lines,
    summary: summarize(lines)
  };
}

export function createRomajiCorrectionDraft(
  report: RomajiComparisonReport,
  options: { projectFile?: string; referenceFile?: string } = {}
): RomajiCorrectionDraft {
  return {
    version: 1,
    type: "romaji_correction_draft",
    source: {
      ...options,
      note: "Draft generated from reference romaji mismatches. Fill suggestedKana manually only when you can verify the kana reading."
    },
    corrections: report.lines.flatMap((line) => {
      if (!line.lyricLineId || !line.original || !line.referenceRomaji || !line.suggestedManualRomaji) {
        return [];
      }
      if (line.status !== "format_difference" && line.status !== "reading_mismatch") {
        return [];
      }

      return [{
        lineId: line.lyricLineId,
        index: line.index,
        original: line.original,
        ...(line.currentKana !== undefined ? { currentKana: line.currentKana } : {}),
        ...(line.generatedRomaji !== undefined ? { currentRomaji: line.generatedRomaji } : {}),
        referenceRomaji: line.referenceRomaji,
        suggestedRomaji: line.suggestedManualRomaji,
        suggestedKana: null,
        status: line.status,
        reviewReasons: line.reviewReasons ?? [],
        note: line.status === "reading_mismatch"
          ? "Reference romaji differs from generated romaji. Review kana manually before filling suggestedKana."
          : "Only formatting differs. suggestedRomaji can usually be applied without changing kana."
      }];
    })
  };
}

export function applyReferenceRomajiOverrides(
  project: AnnotationProject,
  referenceInput: string
): ApplyReferenceRomajiResult {
  const report = compareProjectReferenceRomaji(project, referenceInput);
  let appliedCount = 0;
  let preservedCount = 0;

  const lines = project.lines.map((line, index) => {
    const comparison = report.lines.find((item) => item.index === index);
    const referenceRomaji = comparison?.suggestedManualRomaji;

    if (!referenceRomaji) {
      return line;
    }

    if (line.manualOverrides.romaji) {
      preservedCount += 1;
      return line;
    }

    appliedCount += 1;
    return {
      ...line,
      manualOverrides: {
        ...line.manualOverrides,
        romaji: referenceRomaji
      }
    };
  });

  return {
    project: {
      ...project,
      lines
    },
    report,
    appliedCount,
    preservedCount
  };
}

export function compareRomajiText(generatedRomaji: string, referenceRomaji: string | undefined): RomajiComparisonStatus {
  if (referenceRomaji === undefined) {
    return "missing_reference";
  }

  if (generatedRomaji.trim() === referenceRomaji.trim()) {
    return "exact_match";
  }

  if (normalizeRomajiForComparison(generatedRomaji) === normalizeRomajiForComparison(referenceRomaji)) {
    return "format_difference";
  }

  return "reading_mismatch";
}

export function normalizeRomajiForComparison(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[^a-z0-9]/g, "");
}

export function toReferenceRomajiMarkdown(report: RomajiComparisonReport): string {
  const lines = [
    "# Reference Romaji Comparison",
    "",
    "## Summary",
    "",
    `- Exact match: ${report.summary.exact_match}`,
    `- Format difference: ${report.summary.format_difference}`,
    `- Reading mismatch: ${report.summary.reading_mismatch}`,
    `- Missing reference: ${report.summary.missing_reference}`,
    `- Extra reference: ${report.summary.extra_reference}`,
    "",
    "## Lines",
    ""
  ];

  for (const line of report.lines) {
    const label = line.lyricLineId ?? `reference-${line.index + 1}`;
    lines.push(`### ${label}: ${statusLabel(line.status)}`);
    if (line.original !== undefined) {
      lines.push(`原文：${line.original}`);
    }
    if (line.currentKana !== undefined) {
      lines.push(`Kana：${line.currentKana}`);
    }
    if (line.generatedRomaji !== undefined) {
      lines.push(`Generated romaji：${line.generatedRomaji}`);
    }
    if (line.referenceRomaji !== undefined) {
      lines.push(`Reference romaji：${line.referenceRomaji}`);
    }
    if (line.suggestedManualRomaji !== undefined) {
      lines.push(`Suggested manual romaji：${line.suggestedManualRomaji}`);
    }
    if (line.reviewReasons?.length) {
      lines.push(`Review reasons：${line.reviewReasons.join(", ")}`);
    }
    if (line.suggestedAction !== undefined) {
      lines.push(`Suggested action：${line.suggestedAction}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function shouldSuggestManualRomaji(status: RomajiComparisonStatus, referenceRomaji: string | undefined): referenceRomaji is string {
  return referenceRomaji !== undefined && (status === "format_difference" || status === "reading_mismatch");
}

function suggestedAction(status: RomajiComparisonStatus): string {
  return status === "reading_mismatch"
    ? "Review kana/reading manually; use the reference romaji as a romaji override only after checking this line."
    : "Formatting differs only; use the reference romaji as a manual romaji override if this style is preferred.";
}

function splitReferenceLines(input: string): string[] {
  const normalized = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized.length === 0) {
    return [];
  }
  const lines = normalized.split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function summarize(lines: RomajiComparisonLine[]): Record<RomajiComparisonStatus, number> {
  const summary: Record<RomajiComparisonStatus, number> = {
    exact_match: 0,
    format_difference: 0,
    reading_mismatch: 0,
    missing_reference: 0,
    extra_reference: 0
  };

  for (const line of lines) {
    summary[line.status] += 1;
  }

  return summary;
}

function statusLabel(status: RomajiComparisonStatus): string {
  switch (status) {
    case "exact_match":
      return "exact match";
    case "format_difference":
      return "format difference";
    case "reading_mismatch":
      return "reading mismatch";
    case "missing_reference":
      return "missing reference";
    case "extra_reference":
      return "extra reference";
  }
}
