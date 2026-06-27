import { describe, expect, it } from "vitest";
import { validateAnnotationProject } from "./validation.js";

describe("validateAnnotationProject", () => {
  it("rejects unsupported MVP language", () => {
    const result = validateAnnotationProject({
      version: 1,
      language: "ko",
      source: {},
      settings: {},
      lines: []
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      path: "$.language",
      message: "language must be ja"
    });
  });

  it("rejects duplicate line IDs", () => {
    const line = {
      id: "line-001",
      index: 0,
      original: "あ",
      difficultyNotes: [],
      needsReview: false,
      reviewReasons: [],
      manualOverrides: {}
    };

    const result = validateAnnotationProject({
      version: 1,
      language: "ja",
      source: {},
      settings: {},
      lines: [line, { ...line, index: 1 }]
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      path: "$.lines[1].id",
      message: "id must be unique"
    });
  });

  it("rejects invalid manual override fields", () => {
    const result = validateAnnotationProject({
      version: 1,
      language: "ja",
      source: {},
      settings: {},
      lines: [
        {
          id: "line-001",
          index: 0,
          original: "きっと",
          difficultyNotes: [],
          needsReview: false,
          reviewReasons: [],
          manualOverrides: {
            kana: 123,
            notes: [
              {
                type: "sokuon",
                span: "っ",
                message: "",
                confidence: "certain"
              }
            ]
          }
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      path: "$.lines[0].manualOverrides.kana",
      message: "kana must be a string, null, or omitted"
    });
    expect(result.issues).toContainEqual({
      path: "$.lines[0].manualOverrides.notes[0].message",
      message: "message is required"
    });
    expect(result.issues).toContainEqual({
      path: "$.lines[0].manualOverrides.notes[0].confidence",
      message: "confidence must be high, medium, or low"
    });
  });
});
