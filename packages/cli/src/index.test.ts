import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { runCli } from "./index.js";

describe("runCli", () => {
  it("annotates a UTF-8 input file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const input = join(dir, "input.txt");
    const output = join(dir, "song.json");
    await writeFile(input, "キット\n忘れない", "utf8");

    const result = await runCli(["annotate", input, "--language", "ja", "--out", output]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Annotated 2 lines");

    const project = JSON.parse(await readFile(output, "utf8"));
    expect(project.lines).toHaveLength(2);
    expect(project.lines[0].kana).toBe("きっと");
    expect(project.lines[1].kana).toBe("わすれない");
    expect(project.lines[1].romaji).toBe("wasure nai");
    expect(project.lines[1].reviewReasons).toContain("unknown_kanji_reading");
  });

  it("rejects empty input", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const input = join(dir, "empty.txt");
    const output = join(dir, "song.json");
    await writeFile(input, "\n", "utf8");

    const result = await runCli(["annotate", input, "--language", "ja", "--out", output]);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("input file is empty");
  });

  it("rejects unsupported languages", async () => {
    const result = await runCli(["annotate", "input.txt", "--language", "ko", "--out", "song.json"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("only --language ja");
  });

  it("preserves non-Japanese lines for export", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const input = join(dir, "input.txt");
    const output = join(dir, "song.json");
    await writeFile(input, "Hold my hand", "utf8");

    const result = await runCli(["annotate", input, "--language", "ja", "--out", output]);
    const project = JSON.parse(await readFile(output, "utf8"));

    expect(result.code).toBe(0);
    expect(project.lines[0]).toMatchObject({
      original: "Hold my hand",
      romaji: "Hold my hand",
      zhAssist: "Hold my hand",
      reviewReasons: ["non_japanese_line"]
    });
  });

  it("validates a generated project file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const input = join(dir, "input.txt");
    const output = join(dir, "song.json");
    await writeFile(input, "きっと", "utf8");
    await runCli(["annotate", input, "--language", "ja", "--out", output]);

    const result = await runCli(["validate", output]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Project is valid");
  });

  it("validates project JSON with a UTF-8 BOM", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const projectPath = join(dir, "song.json");
    const project = {
      version: 1,
      language: "ja",
      source: {},
      settings: {},
      lines: []
    };
    await writeFile(projectPath, `\uFEFF${JSON.stringify(project)}`, "utf8");

    const result = await runCli(["validate", projectPath]);

    expect(result.code).toBe(0);
  });

  it("reports invalid project JSON during validate", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const invalid = join(dir, "invalid.json");
    await writeFile(invalid, JSON.stringify({ version: 1, language: "ko", source: {}, settings: {}, lines: [] }), "utf8");

    const result = await runCli(["validate", invalid]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("$.language language must be ja");
  });

  it("reports invalid manual corrections during validate", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const invalid = join(dir, "invalid-correction.json");
    await writeFile(invalid, JSON.stringify({
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
            zhAssist: 42
          }
        }
      ]
    }), "utf8");

    const result = await runCli(["validate", invalid]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("$.lines[0].manualOverrides.zhAssist zhAssist must be a string, null, or omitted");
  });

  it("exports markdown and text from a project file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const input = join(dir, "input.txt");
    const projectPath = join(dir, "song.json");
    const markdownPath = join(dir, "song.md");
    const textPath = join(dir, "song.txt");
    await writeFile(input, "きっと", "utf8");
    await runCli(["annotate", input, "--language", "ja", "--out", projectPath]);

    const markdownResult = await runCli(["export", projectPath, "--format", "markdown", "--out", markdownPath]);
    const textResult = await runCli(["export", projectPath, "--format", "text", "--out", textPath]);

    expect(markdownResult.code).toBe(0);
    expect(textResult.code).toBe(0);
    expect(await readFile(markdownPath, "utf8")).toContain("中文发音辅助：ki t-to");
    expect(await readFile(textPath, "utf8")).toContain("Romaji：kitto");
  });

  it("exports edited manual corrections", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const input = join(dir, "input.txt");
    const projectPath = join(dir, "song.json");
    const markdownPath = join(dir, "song.md");
    await writeFile(input, "きっと", "utf8");
    await runCli(["annotate", input, "--language", "ja", "--out", projectPath]);

    const project = JSON.parse(await readFile(projectPath, "utf8"));
    project.lines[0].manualOverrides.zhAssist = "ki [停半拍] to";
    await writeFile(projectPath, JSON.stringify(project, null, 2), "utf8");

    const result = await runCli(["export", projectPath, "--format", "markdown", "--out", markdownPath]);

    expect(result.code).toBe(0);
    expect(await readFile(markdownPath, "utf8")).toContain("中文发音辅助：ki [停半拍] to");
  });

  it("rejects unsupported export formats", async () => {
    const result = await runCli(["export", "song.json", "--format", "pdf", "--out", "song.pdf"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--format must be markdown, json, or text");
  });

  it("compares generated romaji with a reference romaji file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const lyricsPath = join(dir, "lyrics.txt");
    const referencePath = join(dir, "reference.txt");
    const reportPath = join(dir, "report.md");
    await writeFile(lyricsPath, "きっと\nありがとう", "utf8");
    await writeFile(referencePath, "kitto\nA RI GA TO U", "utf8");

    const result = await runCli([
      "compare-romaji",
      lyricsPath,
      "--reference",
      referencePath,
      "--out",
      reportPath
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Compared 2 lines");
    const report = await readFile(reportPath, "utf8");
    expect(report).toContain("- Exact match: 1");
    expect(report).toContain("- Format difference: 1");
    expect(report).toContain("### line-002: format difference");
  });

  it("requires a reference romaji file for comparison", async () => {
    const result = await runCli(["compare-romaji", "lyrics.txt", "--out", "report.md"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--reference is required");
  });

  it("applies reference romaji to project manual overrides", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const lyricsPath = join(dir, "lyrics.txt");
    const projectPath = join(dir, "song.json");
    const referencePath = join(dir, "reference.txt");
    const correctedPath = join(dir, "corrected.json");
    const markdownPath = join(dir, "corrected.md");
    await writeFile(lyricsPath, "忘れない", "utf8");
    await writeFile(referencePath, "wasuremasen", "utf8");
    await runCli(["annotate", lyricsPath, "--language", "ja", "--out", projectPath]);

    const result = await runCli([
      "apply-romaji-reference",
      projectPath,
      "--reference",
      referencePath,
      "--out",
      correctedPath
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Applied 1 romaji overrides");
    const corrected = JSON.parse(await readFile(correctedPath, "utf8"));
    expect(corrected.lines[0].manualOverrides.romaji).toBe("wasuremasen");

    const exportResult = await runCli(["export", correctedPath, "--format", "markdown", "--out", markdownPath]);

    expect(exportResult.code).toBe(0);
    expect(await readFile(markdownPath, "utf8")).toContain("Romaji：wasuremasen");
  });

  it("drafts a correction file from reference romaji mismatches", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const lyricsPath = join(dir, "lyrics.txt");
    const projectPath = join(dir, "song.json");
    const referencePath = join(dir, "reference.txt");
    const correctionsPath = join(dir, "corrections.json");
    await writeFile(lyricsPath, "忘れない", "utf8");
    await writeFile(referencePath, "wasuremasen", "utf8");
    await runCli(["annotate", lyricsPath, "--language", "ja", "--out", projectPath]);

    const result = await runCli([
      "draft-romaji-corrections",
      projectPath,
      "--reference",
      referencePath,
      "--out",
      correctionsPath
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Drafted 1 romaji corrections");
    const draft = JSON.parse(await readFile(correctionsPath, "utf8"));
    expect(draft).toMatchObject({
      version: 1,
      type: "romaji_correction_draft",
      corrections: [
        {
          lineId: "line-001",
          original: "忘れない",
          currentKana: "わすれない",
          currentRomaji: "wasure nai",
          referenceRomaji: "wasuremasen",
          suggestedRomaji: "wasuremasen",
          suggestedKana: null,
          status: "reading_mismatch",
          reviewReasons: ["unknown_kanji_reading"]
        }
      ]
    });
  });

  it("applies accepted WebUI review decisions without changing ignored or existing overrides", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const lyricsPath = join(dir, "lyrics.txt");
    const projectPath = join(dir, "song.json");
    const decisionsPath = join(dir, "review-decisions.json");
    const reviewedPath = join(dir, "reviewed.json");
    const markdownPath = join(dir, "reviewed.md");
    await writeFile(lyricsPath, "忘れない\nありがとう\n響めき", "utf8");
    await runCli(["annotate", lyricsPath, "--language", "ja", "--out", projectPath]);

    const project = JSON.parse(await readFile(projectPath, "utf8"));
    project.lines[2].manualOverrides.romaji = "keep-me";
    await writeFile(projectPath, JSON.stringify(project, null, 2), "utf8");
    await writeFile(decisionsPath, JSON.stringify({
      version: 1,
      type: "romaji_review_decisions",
      source: {
        projectName: "song.json",
        draftName: "corrections.json",
        exportedAt: "2026-06-28T12:00:00.000Z"
      },
      decisions: [
        reviewDecision("line-001", 0, "accepted", "wasuremasen"),
        reviewDecision("line-002", 1, "ignored", "A RI GA TO U"),
        reviewDecision("line-003", 2, "accepted", "doyomeki")
      ]
    }, null, 2), "utf8");

    const result = await runCli([
      "apply-review-decisions",
      projectPath,
      "--decisions",
      decisionsPath,
      "--out",
      reviewedPath
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Applied 1 review decisions");
    expect(result.stdout).toContain("Ignored 1, pending 0, preserved 1 existing overrides");
    const reviewed = JSON.parse(await readFile(reviewedPath, "utf8"));
    expect(reviewed.lines[0].manualOverrides.romaji).toBe("wasuremasen");
    expect(reviewed.lines[0].manualOverrides.kana).toBeNull();
    expect(reviewed.lines[1].manualOverrides.romaji).toBeNull();
    expect(reviewed.lines[2].manualOverrides.romaji).toBe("keep-me");

    const exportResult = await runCli(["export", reviewedPath, "--format", "markdown", "--out", markdownPath]);

    expect(exportResult.code).toBe(0);
    expect(await readFile(markdownPath, "utf8")).toContain("Romaji：wasuremasen");
  });

  it("rejects invalid review decisions files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const lyricsPath = join(dir, "lyrics.txt");
    const projectPath = join(dir, "song.json");
    const decisionsPath = join(dir, "review-decisions.json");
    const reviewedPath = join(dir, "reviewed.json");
    await writeFile(lyricsPath, "きっと", "utf8");
    await runCli(["annotate", lyricsPath, "--language", "ja", "--out", projectPath]);
    await writeFile(decisionsPath, JSON.stringify({
      version: 1,
      type: "romaji_review_decisions",
      source: {
        projectName: "song.json",
        exportedAt: "2026-06-28T12:00:00.000Z"
      },
      decisions: [
        {
          lineId: "line-001",
          index: 0,
          original: "きっと",
          decision: "accepted",
          correctionStatus: "format_difference",
          suggestedRomaji: "kitto",
          suggestedKana: "きっと",
          note: ""
        }
      ]
    }), "utf8");

    const result = await runCli([
      "apply-review-decisions",
      projectPath,
      "--decisions",
      decisionsPath,
      "--out",
      reviewedPath
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("review decisions JSON is invalid");
    expect(result.stderr).toContain("suggestedKana must be null");
  });

  it("rejects empty lyrics during romaji comparison", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const lyricsPath = join(dir, "lyrics.txt");
    const referencePath = join(dir, "reference.txt");
    const reportPath = join(dir, "report.md");
    await writeFile(lyricsPath, "\n", "utf8");
    await writeFile(referencePath, "kitto", "utf8");

    const result = await runCli([
      "compare-romaji",
      lyricsPath,
      "--reference",
      referencePath,
      "--out",
      reportPath
    ]);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("lyrics input file is empty");
  });

  it("runs the synthetic review workflow sample end to end", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const sampleDir = join(repoRoot(), "samples", "review-workflow");
    const lyricsPath = join(sampleDir, "lyrics.txt");
    const referencePath = join(sampleDir, "reference-romaji.txt");
    const decisionsPath = join(sampleDir, "review-decisions.accept-format-only.json");
    const projectPath = join(dir, "song.json");
    const reportPath = join(dir, "romaji-report.md");
    const correctionsPath = join(dir, "corrections.json");
    const reviewedPath = join(dir, "reviewed.json");
    const markdownPath = join(dir, "reviewed.md");

    const annotateResult = await runCli(["annotate", lyricsPath, "--language", "ja", "--out", projectPath]);
    const compareResult = await runCli([
      "compare-romaji",
      lyricsPath,
      "--reference",
      referencePath,
      "--out",
      reportPath
    ]);
    const draftResult = await runCli([
      "draft-romaji-corrections",
      projectPath,
      "--reference",
      referencePath,
      "--out",
      correctionsPath
    ]);
    const applyResult = await runCli([
      "apply-review-decisions",
      projectPath,
      "--decisions",
      decisionsPath,
      "--out",
      reviewedPath
    ]);
    const exportResult = await runCli(["export", reviewedPath, "--format", "markdown", "--out", markdownPath]);

    expect(annotateResult.code).toBe(0);
    expect(compareResult.code).toBe(0);
    expect(draftResult.code).toBe(0);
    expect(draftResult.stdout).toContain("Drafted 2 romaji corrections");
    expect(applyResult.code).toBe(0);
    expect(applyResult.stdout).toContain("Applied 1 review decisions");
    expect(applyResult.stdout).toContain("Ignored 1, pending 0, preserved 0 existing overrides, missing 0");
    expect(exportResult.code).toBe(0);

    const report = await readFile(reportPath, "utf8");
    expect(report).toContain("- Format difference: 1");
    expect(report).toContain("- Reading mismatch: 1");

    const draft = JSON.parse(await readFile(correctionsPath, "utf8"));
    expect(draft.corrections).toEqual([
      expect.objectContaining({
        lineId: "line-001",
        status: "reading_mismatch",
        suggestedRomaji: "wasuremasen",
        suggestedKana: null
      }),
      expect.objectContaining({
        lineId: "line-002",
        status: "format_difference",
        suggestedRomaji: "A RI GA TO U",
        suggestedKana: null
      })
    ]);

    const reviewed = JSON.parse(await readFile(reviewedPath, "utf8"));
    expect(reviewed.lines[0].manualOverrides.romaji).toBeNull();
    expect(reviewed.lines[0].manualOverrides.kana).toBeNull();
    expect(reviewed.lines[1].manualOverrides.romaji).toBe("A RI GA TO U");
    expect(reviewed.lines[1].manualOverrides.kana).toBeNull();
    expect(await readFile(markdownPath, "utf8")).toContain("Romaji：A RI GA TO U");
  });

  it.each([
    ["sekai-ga-owaru-made-wa", 0, "Romaji：sekai ga owaru made wa"],
    ["dan-dan-kokoro-hikareteku", 0, "Romaji：DAN DAN kokoro hikareteku"],
    ["boku-ga-shinou-to-omotta-no-wa", 0, "Romaji：boku ga shinou to omotta no wa"],
    ["guidance-risk-categories", 2, "Romaji：SA YO NA RA"],
    ["gurenge-reading-mismatch", 1, "Romaji：guren hana"]
  ])("runs the review workflow sample case %s", async (caseName, expectedCorrections, expectedMarkdown) => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const sampleDir = join(repoRoot(), "samples", "review-workflow", "cases", caseName);
    const lyricsPath = join(sampleDir, "lyrics.txt");
    const referencePath = join(sampleDir, "reference-romaji.txt");
    const decisionsPath = join(sampleDir, "review-decisions.json");
    const projectPath = join(dir, "song.json");
    const correctionsPath = join(dir, "corrections.json");
    const reviewedPath = join(dir, "reviewed.json");
    const markdownPath = join(dir, "reviewed.md");

    const annotateResult = await runCli(["annotate", lyricsPath, "--language", "ja", "--out", projectPath]);
    const draftResult = await runCli([
      "draft-romaji-corrections",
      projectPath,
      "--reference",
      referencePath,
      "--out",
      correctionsPath
    ]);
    const applyResult = await runCli([
      "apply-review-decisions",
      projectPath,
      "--decisions",
      decisionsPath,
      "--out",
      reviewedPath
    ]);
    const exportResult = await runCli(["export", reviewedPath, "--format", "markdown", "--out", markdownPath]);

    expect(annotateResult.code).toBe(0);
    expect(draftResult.code).toBe(0);
    expect(draftResult.stdout).toContain(`Drafted ${expectedCorrections} romaji corrections`);
    expect(applyResult.code).toBe(0);
    expect(exportResult.code).toBe(0);
    expect(await readFile(markdownPath, "utf8")).toContain(expectedMarkdown);
  });

  it("keeps guidance risk category decisions scoped to romaji overrides", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const sampleDir = join(repoRoot(), "samples", "review-workflow", "cases", "guidance-risk-categories");
    const lyricsPath = join(sampleDir, "lyrics.txt");
    const referencePath = join(sampleDir, "reference-romaji.txt");
    const decisionsPath = join(sampleDir, "review-decisions.json");
    const projectPath = join(dir, "song.json");
    const correctionsPath = join(dir, "corrections.json");
    const reviewedPath = join(dir, "reviewed.json");

    const annotateResult = await runCli(["annotate", lyricsPath, "--language", "ja", "--out", projectPath]);
    const draftResult = await runCli([
      "draft-romaji-corrections",
      projectPath,
      "--reference",
      referencePath,
      "--out",
      correctionsPath
    ]);
    const applyResult = await runCli([
      "apply-review-decisions",
      projectPath,
      "--decisions",
      decisionsPath,
      "--out",
      reviewedPath
    ]);

    expect(annotateResult.code).toBe(0);
    expect(draftResult.code).toBe(0);
    expect(applyResult.code).toBe(0);

    const draft = JSON.parse(await readFile(correctionsPath, "utf8"));
    expect(draft.corrections).toEqual([
      expect.objectContaining({
        lineId: "line-001",
        status: "format_difference",
        suggestedRomaji: "SA YO NA RA",
        suggestedKana: null
      }),
      expect.objectContaining({
        lineId: "line-002",
        status: "reading_mismatch",
        suggestedRomaji: "matte",
        suggestedKana: null
      })
    ]);

    const reviewed = JSON.parse(await readFile(reviewedPath, "utf8"));
    expect(reviewed.lines[0].manualOverrides.romaji).toBe("SA YO NA RA");
    expect(reviewed.lines[0].manualOverrides.kana).toBeNull();
    expect(reviewed.lines[1].manualOverrides.romaji).toBeNull();
    expect(reviewed.lines[1].manualOverrides.kana).toBeNull();
  });

  it("keeps real kanji reading mismatches in manual review", async () => {
    const dir = await mkdtemp(join(tmpdir(), "singbridge-"));
    const sampleDir = join(repoRoot(), "samples", "review-workflow", "cases", "gurenge-reading-mismatch");
    const lyricsPath = join(sampleDir, "lyrics.txt");
    const referencePath = join(sampleDir, "reference-romaji.txt");
    const decisionsPath = join(sampleDir, "review-decisions.json");
    const projectPath = join(dir, "song.json");
    const correctionsPath = join(dir, "corrections.json");
    const reviewedPath = join(dir, "reviewed.json");

    const annotateResult = await runCli(["annotate", lyricsPath, "--language", "ja", "--out", projectPath]);
    const draftResult = await runCli([
      "draft-romaji-corrections",
      projectPath,
      "--reference",
      referencePath,
      "--out",
      correctionsPath
    ]);
    const applyResult = await runCli([
      "apply-review-decisions",
      projectPath,
      "--decisions",
      decisionsPath,
      "--out",
      reviewedPath
    ]);

    expect(annotateResult.code).toBe(0);
    expect(draftResult.code).toBe(0);
    expect(applyResult.code).toBe(0);

    const draft = JSON.parse(await readFile(correctionsPath, "utf8"));
    expect(draft.corrections).toEqual([
      expect.objectContaining({
        lineId: "line-001",
        status: "reading_mismatch",
        reviewReasons: ["unknown_kanji_reading"],
        suggestedRomaji: "gurenge",
        suggestedKana: null
      })
    ]);

    const reviewed = JSON.parse(await readFile(reviewedPath, "utf8"));
    expect(reviewed.lines[0].manualOverrides.romaji).toBeNull();
    expect(reviewed.lines[0].manualOverrides.kana).toBeNull();
  });
});

function reviewDecision(lineId: string, index: number, decision: "pending" | "accepted" | "ignored", suggestedRomaji: string) {
  return {
    lineId,
    index,
    original: lineId,
    decision,
    correctionStatus: decision === "accepted" ? "reading_mismatch" : "format_difference",
    currentRomaji: "",
    suggestedRomaji,
    suggestedKana: null,
    note: ""
  };
}

function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
}
