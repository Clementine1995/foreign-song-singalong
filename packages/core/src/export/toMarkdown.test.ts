import { describe, expect, it } from "vitest";
import { createAnnotationProject } from "../annotation/createAnnotation.js";
import { parseLyrics } from "../input/parseLyrics.js";
import { toMarkdown } from "./toMarkdown.js";

describe("toMarkdown", () => {
  it("exports practice-ready markdown with difficulty notes", () => {
    const project = createAnnotationProject(parseLyrics("[00:12.30]きっと").lines);

    expect(toMarkdown(project)).toMatchInlineSnapshot(`
      "# SingBridge 标注

      语言：ja

      ## 00:12.30

      原文：きっと
      假名：きっと
      Romaji：kitto
      中文发音辅助：ki t-to
      难点：
      - 小「っ」表示短暂停顿，像卡住半拍再进入后面的音。
      "
    `);
  });

  it("uses manual overrides when present", () => {
    const project = createAnnotationProject(parseLyrics("きっと").lines);
    project.lines[0].manualOverrides.kana = "きと";
    project.lines[0].manualOverrides.romaji = "kito";
    project.lines[0].manualOverrides.zhAssist = "ki [停半拍] to";
    project.lines[0].manualOverrides.notes = [
      {
        type: "rhythm_hint",
        span: "きっと",
        message: "这里按个人练习版处理。",
        confidence: "low"
      }
    ];

    expect(toMarkdown(project)).toContain("假名：きと");
    expect(toMarkdown(project)).toContain("Romaji：kito");
    expect(toMarkdown(project)).toContain("中文发音辅助：ki [停半拍] to");
    expect(toMarkdown(project)).toContain("- 这里按个人练习版处理。");
  });

  it("derives romaji, zhAssist, and notes from a manual kana override", () => {
    const project = createAnnotationProject(parseLyrics("夜だけど").lines);
    project.lines[0].manualOverrides.kana = "よるだけど";

    const markdown = toMarkdown(project);

    expect(markdown).toContain("假名：よるだけど");
    expect(markdown).toContain("Romaji：yorudakedo");
    expect(markdown).toContain("中文发音辅助：yo lu/ru da ke do");
    expect(markdown).toContain("「る」在 l/r 之间轻触");
  });
});
