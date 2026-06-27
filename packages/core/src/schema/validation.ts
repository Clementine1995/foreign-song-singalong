import type { AnnotationProject } from "./annotation.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validateAnnotationProject(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ path: "$", message: "project must be an object" }]
    };
  }

  if (value.version !== 1) {
    issues.push({ path: "$.version", message: "version must be 1" });
  }

  if (value.language !== "ja") {
    issues.push({ path: "$.language", message: "language must be ja" });
  }

  if (!isRecord(value.source)) {
    issues.push({ path: "$.source", message: "source must be an object" });
  }

  if (!isRecord(value.settings)) {
    issues.push({ path: "$.settings", message: "settings must be an object" });
  }

  if (!Array.isArray(value.lines)) {
    issues.push({ path: "$.lines", message: "lines must be an array" });
  } else {
    validateLines(value.lines, issues);
  }

  return { valid: issues.length === 0, issues };
}

export function assertAnnotationProject(value: unknown): asserts value is AnnotationProject {
  const result = validateAnnotationProject(value);
  if (!result.valid) {
    const message = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`Invalid annotation project: ${message}`);
  }
}

function validateLines(lines: unknown[], issues: ValidationIssue[]): void {
  const ids = new Set<string>();

  lines.forEach((line, index) => {
    const basePath = `$.lines[${index}]`;
    if (!isRecord(line)) {
      issues.push({ path: basePath, message: "line must be an object" });
      return;
    }

    if (typeof line.id !== "string" || line.id.length === 0) {
      issues.push({ path: `${basePath}.id`, message: "id is required" });
    } else if (ids.has(line.id)) {
      issues.push({ path: `${basePath}.id`, message: "id must be unique" });
    } else {
      ids.add(line.id);
    }

    if (line.index !== index) {
      issues.push({ path: `${basePath}.index`, message: "index must match line position" });
    }

    if (typeof line.original !== "string") {
      issues.push({ path: `${basePath}.original`, message: "original must be a string" });
    }

    if (!Array.isArray(line.difficultyNotes)) {
      issues.push({ path: `${basePath}.difficultyNotes`, message: "difficultyNotes must be an array" });
    } else {
      validateDifficultyNotes(line.difficultyNotes, `${basePath}.difficultyNotes`, issues);
    }

    if (typeof line.needsReview !== "boolean") {
      issues.push({ path: `${basePath}.needsReview`, message: "needsReview must be a boolean" });
    }

    if (!Array.isArray(line.reviewReasons)) {
      issues.push({ path: `${basePath}.reviewReasons`, message: "reviewReasons must be an array" });
    }

    if (!isRecord(line.manualOverrides)) {
      issues.push({ path: `${basePath}.manualOverrides`, message: "manualOverrides must be an object" });
    } else {
      validateManualOverrides(line.manualOverrides, `${basePath}.manualOverrides`, issues);
    }
  });
}

function validateManualOverrides(
  manualOverrides: Record<string, unknown>,
  basePath: string,
  issues: ValidationIssue[]
): void {
  for (const field of ["reading", "kana", "romaji", "zhAssist"]) {
    const value = manualOverrides[field];
    if (value !== undefined && value !== null && typeof value !== "string") {
      issues.push({ path: `${basePath}.${field}`, message: `${field} must be a string, null, or omitted` });
    }
  }

  const notes = manualOverrides.notes;
  if (notes !== undefined && !Array.isArray(notes)) {
    issues.push({ path: `${basePath}.notes`, message: "notes must be an array when provided" });
    return;
  }

  if (Array.isArray(notes)) {
    validateDifficultyNotes(notes, `${basePath}.notes`, issues);
  }
}

function validateDifficultyNotes(notes: unknown[], basePath: string, issues: ValidationIssue[]): void {
  notes.forEach((note, index) => {
    const notePath = `${basePath}[${index}]`;
    if (!isRecord(note)) {
      issues.push({ path: notePath, message: "note must be an object" });
      return;
    }

    if (typeof note.type !== "string" || note.type.length === 0) {
      issues.push({ path: `${notePath}.type`, message: "type is required" });
    }

    if (typeof note.span !== "string") {
      issues.push({ path: `${notePath}.span`, message: "span must be a string" });
    }

    if (typeof note.message !== "string" || note.message.length === 0) {
      issues.push({ path: `${notePath}.message`, message: "message is required" });
    }

    if (!["high", "medium", "low"].includes(String(note.confidence))) {
      issues.push({ path: `${notePath}.confidence`, message: "confidence must be high, medium, or low" });
    }

    if (note.start !== undefined && typeof note.start !== "number") {
      issues.push({ path: `${notePath}.start`, message: "start must be a number when provided" });
    }

    if (note.end !== undefined && typeof note.end !== "number") {
      issues.push({ path: `${notePath}.end`, message: "end must be a number when provided" });
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
