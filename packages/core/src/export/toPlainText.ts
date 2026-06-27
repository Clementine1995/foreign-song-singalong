import type { AnnotationProject } from "../schema/annotation.js";
import { getEffectiveLine } from "./effectiveLine.js";

export function toPlainText(project: AnnotationProject): string {
  const lines: string[] = [];

  if (project.title || project.artist) {
    lines.push([project.title, project.artist].filter(Boolean).join(" - "));
    lines.push("");
  }

  for (const line of project.lines) {
    const effective = getEffectiveLine(line);

    if (effective.original.length === 0) {
      lines.push("");
      continue;
    }

    if (line.timestamp) {
      lines.push(`[${line.timestamp}]`);
    }
    lines.push(`原文：${effective.original}`);
    if (effective.kana !== undefined) {
      lines.push(`假名：${effective.kana}`);
    }
    if (effective.romaji !== undefined) {
      lines.push(`Romaji：${effective.romaji}`);
    }
    if (effective.zhAssist !== undefined) {
      lines.push(`中文发音辅助：${effective.zhAssist}`);
    }
    if (effective.difficultyNotes.length > 0) {
      lines.push(`难点：${effective.difficultyNotes.map((note) => note.message).join("；")}`);
    }
    if (line.needsReview) {
      lines.push(`复核：${line.reviewReasons.join(", ")}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
