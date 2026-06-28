import { describe, expect, it } from "vitest";
import { emptyCorrectionDraft, parseAnnotationProject, parseCorrectionDraft } from "./fileValidation";
import projectFixture from "../public/fixtures/annotation-ja.json";
import draftFixture from "../public/fixtures/correction-draft.json";

describe("file validation", () => {
  it("accepts annotation projects and correction drafts", () => {
    expect(parseAnnotationProject(projectFixture).lines).toHaveLength(4);
    expect(parseCorrectionDraft(draftFixture).corrections).toHaveLength(2);
  });

  it("rejects invalid correction drafts", () => {
    expect(() => parseCorrectionDraft({ version: 1, type: "romaji_correction_draft", corrections: [
      { lineId: "line-001", suggestedRomaji: "kitto", suggestedKana: "きっと", status: "reading_mismatch", note: "" }
    ] })).toThrow("suggestedKana 必须是 null");
  });

  it("creates an empty draft for project-only loading", () => {
    expect(emptyCorrectionDraft()).toMatchObject({
      version: 1,
      type: "romaji_correction_draft",
      corrections: []
    });
  });
});
