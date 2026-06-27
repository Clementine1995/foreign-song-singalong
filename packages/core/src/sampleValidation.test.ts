import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createAnnotationProject } from "./annotation/createAnnotation.js";
import { parseLyrics } from "./input/parseLyrics.js";
import { toMarkdown } from "./export/toMarkdown.js";

describe("sample validation fixture", () => {
  it("converts representative short Japanese singing lines", () => {
    const input = readFileSync(new URL("../fixtures/sample-validation-ja.txt", import.meta.url), "utf8");
    const project = createAnnotationProject(parseLyrics(input).lines);
    const markdown = toMarkdown(project);

    expect(project.lines).toHaveLength(5);
    expect(project.lines[0]).toMatchObject({
      timestamp: "00:01.00",
      romaji: "chottomatte",
      zhAssist: "cho t-to ma t-te"
    });
    expect(project.lines[1]).toMatchObject({
      romaji: "kyoumoarigatou",
      zhAssist: "kyo-o mo a li/ri ga to-o"
    });
    expect(project.lines[2].difficultyNotes.map((note) => note.type)).toEqual([
      "tsu",
      "fu",
      "ra_row",
      "ra_row"
    ]);
    expect(project.lines[4]).toMatchObject({
      romaji: "faito、tiara",
      zhAssist: "fa i to、 ti a la/ra"
    });
    expect(markdown).toContain("中文发音辅助：fa i to、 ti a la/ra");
  });
});
