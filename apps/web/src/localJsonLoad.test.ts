import { describe, expect, it } from "vitest";
import { loadAnnotationProjectValue, loadCorrectionDraftValue } from "./localJsonLoad";
import projectFixture from "../public/fixtures/annotation-ja.json";
import draftFixture from "../public/fixtures/correction-draft.json";
import fullDemoProjectFixture from "../public/fixtures/annotation-full-demo.json";
import fullDemoDraftFixture from "../public/fixtures/correction-draft-full-demo.json";

describe("local JSON loading", () => {
  it("loads an annotation project and clears stale correction overlays", () => {
    const loaded = loadAnnotationProjectValue(projectFixture, "song.json");

    expect(loaded.projectName).toBe("song.json");
    expect(loaded.draftName).toBeUndefined();
    expect(loaded.draft.corrections).toEqual([]);
  });

  it("loads a correction draft into the current project", () => {
    const loaded = loadAnnotationProjectValue(projectFixture, "song.json");
    const withDraft = loadCorrectionDraftValue(loaded, draftFixture, "corrections.json");

    expect(withDraft.projectName).toBe("song.json");
    expect(withDraft.draftName).toBe("corrections.json");
    expect(withDraft.draft.corrections.map((item) => item.lineId)).toEqual(["line-002", "line-003"]);
  });

  it("loads the synthetic full-song demo fixture", () => {
    const loaded = loadAnnotationProjectValue(fullDemoProjectFixture, "annotation-full-demo.json");
    const withDraft = loadCorrectionDraftValue(loaded, fullDemoDraftFixture, "correction-draft-full-demo.json");

    expect(withDraft.project.lines).toHaveLength(24);
    expect(withDraft.draft.corrections).toEqual([]);
  });
});
