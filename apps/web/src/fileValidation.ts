import type { AnnotationProject, RomajiCorrectionDraft } from "./types";

export function emptyCorrectionDraft(): RomajiCorrectionDraft {
  return {
    version: 1,
    type: "romaji_correction_draft",
    source: {
      note: "未加载修正建议文件。"
    },
    corrections: []
  };
}

export function parseAnnotationProject(value: unknown): AnnotationProject {
  if (!isRecord(value)) {
    throw new Error("标注 JSON 格式不正确：文件内容必须是对象。");
  }

  if (value.version !== 1) {
    throw new Error("标注 JSON 格式不正确：version 必须是 1。");
  }

  if (value.language !== "ja") {
    throw new Error("标注 JSON 格式不正确：language 必须是 ja。");
  }

  if (!isRecord(value.source)) {
    throw new Error("标注 JSON 格式不正确：source 必须是对象。");
  }

  if (!isRecord(value.settings)) {
    throw new Error("标注 JSON 格式不正确：settings 必须是对象。");
  }

  if (!Array.isArray(value.lines)) {
    throw new Error("标注 JSON 格式不正确：lines 必须是数组。");
  }

  value.lines.forEach((line, index) => {
    const path = `lines[${index}]`;
    if (!isRecord(line)) {
      throw new Error(`标注 JSON 格式不正确：${path} 必须是对象。`);
    }
    if (typeof line.id !== "string" || line.id.length === 0) {
      throw new Error(`标注 JSON 格式不正确：${path}.id 必须是非空字符串。`);
    }
    if (line.index !== index) {
      throw new Error(`标注 JSON 格式不正确：${path}.index 必须和行位置一致。`);
    }
    if (typeof line.original !== "string") {
      throw new Error(`标注 JSON 格式不正确：${path}.original 必须是字符串。`);
    }
    if (!Array.isArray(line.difficultyNotes)) {
      throw new Error(`标注 JSON 格式不正确：${path}.difficultyNotes 必须是数组。`);
    }
    if (typeof line.needsReview !== "boolean") {
      throw new Error(`标注 JSON 格式不正确：${path}.needsReview 必须是布尔值。`);
    }
    if (!Array.isArray(line.reviewReasons)) {
      throw new Error(`标注 JSON 格式不正确：${path}.reviewReasons 必须是数组。`);
    }
    if (!isRecord(line.manualOverrides)) {
      throw new Error(`标注 JSON 格式不正确：${path}.manualOverrides 必须是对象。`);
    }
  });

  return value as unknown as AnnotationProject;
}

export function parseCorrectionDraft(value: unknown): RomajiCorrectionDraft {
  if (!isRecord(value)) {
    throw new Error("修正建议 JSON 格式不正确：文件内容必须是对象。");
  }

  if (value.version !== 1) {
    throw new Error("修正建议 JSON 格式不正确：version 必须是 1。");
  }

  if (value.type !== "romaji_correction_draft") {
    throw new Error("修正建议 JSON 格式不正确：type 必须是 romaji_correction_draft。");
  }

  if (!Array.isArray(value.corrections)) {
    throw new Error("修正建议 JSON 格式不正确：corrections 必须是数组。");
  }

  value.corrections.forEach((correction, index) => {
    const path = `corrections[${index}]`;
    if (!isRecord(correction)) {
      throw new Error(`修正建议 JSON 格式不正确：${path} 必须是对象。`);
    }
    if (typeof correction.lineId !== "string" || correction.lineId.length === 0) {
      throw new Error(`修正建议 JSON 格式不正确：${path}.lineId 必须是非空字符串。`);
    }
    if (typeof correction.suggestedRomaji !== "string" || correction.suggestedRomaji.length === 0) {
      throw new Error(`修正建议 JSON 格式不正确：${path}.suggestedRomaji 必须是非空字符串。`);
    }
    if (correction.suggestedKana !== null) {
      throw new Error(`修正建议 JSON 格式不正确：${path}.suggestedKana 必须是 null。`);
    }
    if (correction.status !== "format_difference" && correction.status !== "reading_mismatch") {
      throw new Error(`修正建议 JSON 格式不正确：${path}.status 必须是 format_difference 或 reading_mismatch。`);
    }
    if (typeof correction.note !== "string") {
      throw new Error(`修正建议 JSON 格式不正确：${path}.note 必须是字符串。`);
    }
  });

  return value as unknown as RomajiCorrectionDraft;
}

export async function readJsonFile(file: File): Promise<unknown> {
  try {
    return JSON.parse(await file.text());
  } catch {
    throw new Error("无法读取 JSON：请确认文件是有效的 UTF-8 JSON。");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
