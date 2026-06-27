import { describe, expect, it } from "vitest";
import { createAnnotationProject } from "./createAnnotation.js";
import { parseLyrics } from "../input/parseLyrics.js";
import { validateAnnotationProject } from "../schema/validation.js";

describe("createAnnotationProject", () => {
  it("creates valid baseline annotation JSON", () => {
    const parsed = parseLyrics("[00:12.30]キット\nplain english");
    const project = createAnnotationProject(parsed.lines, { inputFile: "input.txt" });

    expect(validateAnnotationProject(project).valid).toBe(true);
    expect(project).toMatchInlineSnapshot(`
      {
        "language": "ja",
        "lines": [
          {
            "difficultyNotes": [
              {
                "confidence": "high",
                "end": 2,
                "message": "小「っ」表示短暂停顿，像卡住半拍再进入后面的音。",
                "span": "っ",
                "start": 1,
                "type": "sokuon",
              },
            ],
            "id": "line-001",
            "index": 0,
            "kana": "きっと",
            "manualOverrides": {
              "kana": null,
              "notes": [],
              "reading": null,
              "romaji": null,
              "zhAssist": null,
            },
            "needsReview": false,
            "original": "キット",
            "reading": "きっと",
            "reviewReasons": [],
            "romaji": "kitto",
            "timestamp": "00:12.30",
            "zhAssist": "ki t-to",
          },
          {
            "difficultyNotes": [],
            "id": "line-002",
            "index": 1,
            "manualOverrides": {
              "kana": null,
              "notes": [],
              "reading": null,
              "romaji": null,
              "zhAssist": null,
            },
            "needsReview": true,
            "original": "plain english",
            "reading": "plain english",
            "reviewReasons": [
              "non_japanese_line",
            ],
            "romaji": "plain english",
            "zhAssist": "plain english",
          },
        ],
        "settings": {
          "pronunciationMode": "zh_assist",
          "romajiStyle": "singing_friendly",
        },
        "source": {
          "inputFile": "input.txt",
          "note": "User-provided lyrics",
          "type": "file_import",
        },
        "version": 1,
      }
    `);
  });

  it("marks kanji readings for review", () => {
    const parsed = parseLyrics("忘れない");
    const project = createAnnotationProject(parsed.lines);

    expect(project.lines[0].needsReview).toBe(true);
    expect(project.lines[0].reviewReasons).toContain("unknown_kanji_reading");
  });
});
