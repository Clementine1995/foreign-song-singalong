import type { AnnotationProject } from "../schema/annotation.js";
import { getEffectiveLine } from "./effectiveLine.js";

export function toMarkdown(project: AnnotationProject): string {
  const lines: string[] = ["# SingBridge 标注"];

  if (project.title) {
    lines.push("", `歌曲：${project.title}`);
  }

  if (project.artist) {
    lines.push(`歌手：${project.artist}`);
  }

  lines.push("", `语言：${project.language}`, "");

  for (const line of project.lines) {
    const effective = getEffectiveLine(line);
    const heading = line.timestamp ? `## ${line.timestamp}` : `## Line ${line.index + 1}`;
    lines.push(heading);

    if (effective.original.length === 0) {
      lines.push("", "_空行_", "");
      continue;
    }

    lines.push("");
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
      lines.push("难点：");
      for (const note of effective.difficultyNotes) {
        lines.push(`- ${note.message}`);
      }
    }

    if (line.needsReview) {
      lines.push(`复核：${line.reviewReasons.join(", ")}`);
    }

    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
