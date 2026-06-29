#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  assertAnnotationProject,
  applyRomajiReviewDecisions,
  applyReferenceRomajiOverrides,
  createAnnotationProjectWithReading,
  compareReferenceRomaji,
  compareProjectReferenceRomaji,
  createRomajiCorrectionDraft,
  parseRomajiReviewDecisionExport,
  type AnnotationProject,
  parseLyrics,
  toReferenceRomajiMarkdown,
  toMarkdown,
  toPlainText,
  validateAnnotationProject
} from "@singbridge/core";

interface CliResult {
  code: number;
  stdout?: string;
  stderr?: string;
}

export async function runCli(argv: string[]): Promise<CliResult> {
  const [command, ...args] = argv;

  if (!command || command === "--help" || command === "-h") {
    return { code: 0, stdout: helpText() };
  }

  switch (command) {
    case "annotate":
      return annotate(args);
    case "validate":
      return validate(args);
    case "export":
      return exportProject(args);
    case "compare-romaji":
      return compareRomaji(args);
    case "apply-romaji-reference":
      return applyRomajiReference(args);
    case "draft-romaji-corrections":
      return draftRomajiCorrections(args);
    case "apply-review-decisions":
      return applyReviewDecisions(args);
    default:
      return {
        code: 1,
        stderr: `Error: unknown command "${command}".\nNext step: run singbridge --help.`
      };
  }
}

async function applyReviewDecisions(args: string[]): Promise<CliResult> {
  const inputPath = args[0];
  const decisionsPath = readOption(args, "--decisions");
  const outPath = readOption(args, "--out");

  if (!inputPath || inputPath.startsWith("--")) {
    return {
      code: 1,
      stderr: "Error: project JSON file is required.\nNext step: run singbridge apply-review-decisions song.json --decisions romaji-review-decisions.json --out reviewed.json."
    };
  }

  if (!decisionsPath) {
    return {
      code: 1,
      stderr: "Error: --decisions is required.\nNext step: provide a WebUI-exported romaji review decisions JSON file."
    };
  }

  if (!outPath) {
    return {
      code: 1,
      stderr: "Error: --out is required.\nNext step: provide an output JSON path."
    };
  }

  const loaded = await loadProject(inputPath);
  if (!loaded.ok) {
    return loaded.result;
  }

  const loadedDecisions = await loadReviewDecisions(decisionsPath);
  if (!loadedDecisions.ok) {
    return loadedDecisions.result;
  }

  const result = applyRomajiReviewDecisions(loaded.project, loadedDecisions.review);
  const validation = validateAnnotationProject(result.project);
  if (!validation.valid) {
    return {
      code: 2,
      stderr: `Error: reviewed project is invalid.\nCause: ${validation.issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`
    };
  }

  try {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(result.project, null, 2)}\n`, "utf8");
  } catch (error) {
    return {
      code: 3,
      stderr: `Error: could not write output file "${outPath}".\nCause: ${formatCause(error)}\nNext step: choose a writable output path.`
    };
  }

  return {
    code: 0,
    stdout: [
      `Applied ${result.appliedCount} review decisions -> ${outPath}`,
      `Ignored ${result.ignoredCount}, pending ${result.pendingCount}, preserved ${result.preservedCount} existing overrides, missing ${result.missingLineCount}`
    ].join("\n")
  };
}

async function draftRomajiCorrections(args: string[]): Promise<CliResult> {
  const inputPath = args[0];
  const referencePath = readOption(args, "--reference");
  const outPath = readOption(args, "--out");

  if (!inputPath || inputPath.startsWith("--")) {
    return {
      code: 1,
      stderr: "Error: project JSON file is required.\nNext step: run singbridge draft-romaji-corrections song.json --reference reference-romaji.txt --out corrections.json."
    };
  }

  if (!referencePath) {
    return {
      code: 1,
      stderr: "Error: --reference is required.\nNext step: provide a UTF-8 text file with one reference romaji line per lyric line."
    };
  }

  if (!outPath) {
    return {
      code: 1,
      stderr: "Error: --out is required.\nNext step: provide an output correction draft path."
    };
  }

  const loaded = await loadProject(inputPath);
  if (!loaded.ok) {
    return loaded.result;
  }

  let reference: string;
  try {
    reference = await readFile(referencePath, "utf8");
  } catch (error) {
    return {
      code: 1,
      stderr: `Error: could not read reference romaji file "${referencePath}".\nCause: ${formatCause(error)}\nNext step: check the path and ensure it is UTF-8 text.`
    };
  }

  const report = compareProjectReferenceRomaji(loaded.project, reference);
  const draft = createRomajiCorrectionDraft(report, { projectFile: inputPath, referenceFile: referencePath });

  try {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
  } catch (error) {
    return {
      code: 3,
      stderr: `Error: could not write output file "${outPath}".\nCause: ${formatCause(error)}\nNext step: choose a writable output path.`
    };
  }

  return {
    code: 0,
    stdout: `Drafted ${draft.corrections.length} romaji corrections -> ${outPath}`
  };
}

async function applyRomajiReference(args: string[]): Promise<CliResult> {
  const inputPath = args[0];
  const referencePath = readOption(args, "--reference");
  const outPath = readOption(args, "--out");

  if (!inputPath || inputPath.startsWith("--")) {
    return {
      code: 1,
      stderr: "Error: project JSON file is required.\nNext step: run singbridge apply-romaji-reference song.json --reference reference-romaji.txt --out corrected.json."
    };
  }

  if (!referencePath) {
    return {
      code: 1,
      stderr: "Error: --reference is required.\nNext step: provide a UTF-8 text file with one reference romaji line per lyric line."
    };
  }

  if (!outPath) {
    return {
      code: 1,
      stderr: "Error: --out is required.\nNext step: provide an output JSON path."
    };
  }

  const loaded = await loadProject(inputPath);
  if (!loaded.ok) {
    return loaded.result;
  }

  let reference: string;
  try {
    reference = await readFile(referencePath, "utf8");
  } catch (error) {
    return {
      code: 1,
      stderr: `Error: could not read reference romaji file "${referencePath}".\nCause: ${formatCause(error)}\nNext step: check the path and ensure it is UTF-8 text.`
    };
  }

  const result = applyReferenceRomajiOverrides(loaded.project, reference);
  const validation = validateAnnotationProject(result.project);
  if (!validation.valid) {
    return {
      code: 2,
      stderr: `Error: corrected project is invalid.\nCause: ${validation.issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`
    };
  }

  try {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(result.project, null, 2)}\n`, "utf8");
  } catch (error) {
    return {
      code: 3,
      stderr: `Error: could not write output file "${outPath}".\nCause: ${formatCause(error)}\nNext step: choose a writable output path.`
    };
  }

  return {
    code: 0,
    stdout: `Applied ${result.appliedCount} romaji overrides -> ${outPath}${result.preservedCount ? ` (${result.preservedCount} existing overrides preserved)` : ""}`
  };
}

async function compareRomaji(args: string[]): Promise<CliResult> {
  const inputPath = args[0];
  const referencePath = readOption(args, "--reference");
  const outPath = readOption(args, "--out");

  if (!inputPath || inputPath.startsWith("--")) {
    return {
      code: 1,
      stderr: "Error: lyrics input file is required.\nNext step: run singbridge compare-romaji lyrics.txt --reference reference-romaji.txt --out report.md."
    };
  }

  if (!referencePath) {
    return {
      code: 1,
      stderr: "Error: --reference is required.\nNext step: provide a UTF-8 text file with one reference romaji line per lyric line."
    };
  }

  if (!outPath) {
    return {
      code: 1,
      stderr: "Error: --out is required.\nNext step: provide an output Markdown report path."
    };
  }

  let input: string;
  let reference: string;
  try {
    input = await readFile(inputPath, "utf8");
  } catch (error) {
    return {
      code: 1,
      stderr: `Error: could not read lyrics file "${inputPath}".\nCause: ${formatCause(error)}\nNext step: check the path and ensure it is UTF-8 text.`
    };
  }

  try {
    reference = await readFile(referencePath, "utf8");
  } catch (error) {
    return {
      code: 1,
      stderr: `Error: could not read reference romaji file "${referencePath}".\nCause: ${formatCause(error)}\nNext step: check the path and ensure it is UTF-8 text.`
    };
  }

  try {
    const parsed = parseLyrics(input);
    const report = await compareReferenceRomaji(parsed.lines, reference);
    const markdown = toReferenceRomajiMarkdown(report);

    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, markdown, "utf8");

    return {
      code: 0,
      stdout: `Compared ${report.lines.length} lines -> ${outPath}`
    };
  } catch (error) {
    const message = error instanceof Error && error.message === "input is empty"
      ? "Error: lyrics input file is empty.\nNext step: provide a UTF-8 text file with Japanese lyrics."
      : `Error: romaji comparison failed.\nCause: ${formatCause(error)}`;

    return { code: 2, stderr: message };
  }
}

async function annotate(args: string[]): Promise<CliResult> {
  const inputPath = args[0];
  const language = readOption(args, "--language") ?? "ja";
  const outPath = readOption(args, "--out");

  if (!inputPath || inputPath.startsWith("--")) {
    return {
      code: 1,
      stderr: "Error: input file is required.\nNext step: run singbridge annotate input.txt --language ja --out song.json."
    };
  }

  if (language !== "ja") {
    return {
      code: 1,
      stderr: "Error: only --language ja is supported in MVP.\nNext step: use --language ja."
    };
  }

  if (!outPath) {
    return {
      code: 1,
      stderr: "Error: --out is required.\nNext step: provide an output JSON path."
    };
  }

  let input: string;
  try {
    input = await readFile(inputPath, "utf8");
  } catch (error) {
    return {
      code: 1,
      stderr: `Error: could not read input file "${inputPath}".\nCause: ${formatCause(error)}\nNext step: check the path and ensure it is UTF-8 text.`
    };
  }

  try {
    const parsed = parseLyrics(input);
    const project = await createAnnotationProjectWithReading(parsed.lines, { inputFile: inputPath });
    const validation = validateAnnotationProject(project);

    if (!validation.valid) {
      return {
        code: 2,
        stderr: `Error: generated project is invalid.\nCause: ${validation.issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`
      };
    }

    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(project, null, 2)}\n`, "utf8");

    return {
      code: 0,
      stdout: `Annotated ${project.lines.length} lines -> ${outPath}`
    };
  } catch (error) {
    const message = error instanceof Error && error.message === "input is empty"
      ? "Error: input file is empty.\nNext step: provide a UTF-8 text file with Japanese lyrics."
      : `Error: annotation failed.\nCause: ${formatCause(error)}`;

    return { code: 2, stderr: message };
  }
}

async function validate(args: string[]): Promise<CliResult> {
  const inputPath = args[0];

  if (!inputPath || inputPath.startsWith("--")) {
    return {
      code: 1,
      stderr: "Error: project JSON file is required.\nNext step: run singbridge validate song.json."
    };
  }

  const loaded = await loadProject(inputPath);
  if (!loaded.ok) {
    return loaded.result;
  }

  return {
    code: 0,
    stdout: `Project is valid: ${inputPath}`
  };
}

async function exportProject(args: string[]): Promise<CliResult> {
  const inputPath = args[0];
  const format = readOption(args, "--format") ?? "markdown";
  const outPath = readOption(args, "--out");

  if (!inputPath || inputPath.startsWith("--")) {
    return {
      code: 1,
      stderr: "Error: project JSON file is required.\nNext step: run singbridge export song.json --format markdown --out song.md."
    };
  }

  if (!["markdown", "json", "text"].includes(format)) {
    return {
      code: 1,
      stderr: "Error: --format must be markdown, json, or text.\nNext step: choose one supported export format."
    };
  }

  if (!outPath) {
    return {
      code: 1,
      stderr: "Error: --out is required.\nNext step: provide an output file path."
    };
  }

  const loaded = await loadProject(inputPath);
  if (!loaded.ok) {
    return loaded.result;
  }

  const output = renderExport(loaded.project, format);

  try {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, output, "utf8");
  } catch (error) {
    return {
      code: 3,
      stderr: `Error: could not write output file "${outPath}".\nCause: ${formatCause(error)}\nNext step: choose a writable output path.`
    };
  }

  return {
    code: 0,
    stdout: `Exported ${format} -> ${outPath}`
  };
}

async function loadProject(inputPath: string): Promise<
  | { ok: true; project: AnnotationProject }
  | { ok: false; result: CliResult }
> {
  let raw: string;
  try {
    raw = await readFile(inputPath, "utf8");
  } catch (error) {
    return {
      ok: false,
      result: {
        code: 1,
        stderr: `Error: could not read project file "${inputPath}".\nCause: ${formatCause(error)}\nNext step: check the path and try again.`
      }
    };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (error) {
    return {
      ok: false,
      result: {
        code: 1,
        stderr: `Error: project file is not valid JSON.\nCause: ${formatCause(error)}\nNext step: fix the JSON syntax and run validate again.`
      }
    };
  }

  const validation = validateAnnotationProject(value);
  if (!validation.valid) {
    return {
      ok: false,
      result: {
        code: 1,
        stderr: `Error: project JSON is invalid.\nCause: ${validation.issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`
      }
    };
  }

  assertAnnotationProject(value);
  return { ok: true, project: value };
}

async function loadReviewDecisions(decisionsPath: string): Promise<
  | { ok: true; review: ReturnType<typeof parseRomajiReviewDecisionExport> }
  | { ok: false; result: CliResult }
> {
  let raw: string;
  try {
    raw = await readFile(decisionsPath, "utf8");
  } catch (error) {
    return {
      ok: false,
      result: {
        code: 1,
        stderr: `Error: could not read review decisions file "${decisionsPath}".\nCause: ${formatCause(error)}\nNext step: check the path and try again.`
      }
    };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (error) {
    return {
      ok: false,
      result: {
        code: 1,
        stderr: `Error: review decisions file is not valid JSON.\nCause: ${formatCause(error)}\nNext step: fix the JSON syntax and export decisions again.`
      }
    };
  }

  try {
    return { ok: true, review: parseRomajiReviewDecisionExport(value) };
  } catch (error) {
    return {
      ok: false,
      result: {
        code: 1,
        stderr: `Error: review decisions JSON is invalid.\nCause: ${formatCause(error)}`
      }
    };
  }
}

function renderExport(project: AnnotationProject, format: string): string {
  if (format === "json") {
    return `${JSON.stringify(project, null, 2)}\n`;
  }
  if (format === "text") {
    return toPlainText(project);
  }
  return toMarkdown(project);
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function formatCause(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function helpText(): string {
  return [
    "SingBridge CLI",
    "",
    "Commands:",
    "  singbridge annotate input.txt --language ja --out song.json",
    "  singbridge validate song.json",
    "  singbridge export song.json --format markdown --out song.md",
    "  singbridge compare-romaji lyrics.txt --reference reference-romaji.txt --out report.md",
    "  singbridge apply-romaji-reference song.json --reference reference-romaji.txt --out corrected.json",
    "  singbridge draft-romaji-corrections song.json --reference reference-romaji.txt --out corrections.json",
    "  singbridge apply-review-decisions song.json --decisions romaji-review-decisions.json --out reviewed.json",
    "",
    "Export formats: markdown, json, text.",
    "MVP supports Japanese lyrics only. Input must be user-provided UTF-8 text."
  ].join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await runCli(process.argv.slice(2));
  if (result.stdout) {
    console.log(result.stdout);
  }
  if (result.stderr) {
    console.error(result.stderr);
  }
  process.exitCode = result.code;
}
