import { describe, expect, it } from "vitest";
import { createAnnotationProject } from "../annotation/createAnnotation.js";
import { parseLyrics } from "../input/parseLyrics.js";
import { toPlainText } from "./toPlainText.js";

describe("toPlainText", () => {
  it("exports compact copy-friendly text", () => {
    const project = createAnnotationProject(parseLyrics("つふれん").lines);

    expect(toPlainText(project)).toMatchInlineSnapshot(`
      "原文：つふれん
      假名：つふれん
      Romaji：tsufuren
      中文发音辅助：tsu fu le/re n
      难点：「つ」接近 tsu，不要直接读成中文拼音 ci。；「ふ」嘴唇放松送气，和中文的 fu 不完全一样。；「れ」在 l/r 之间轻触，不要读成很重的中文 r。；「ん」是拨音，跟后面的音连在一起时鼻音位置会变化。
      "
    `);
  });
});
