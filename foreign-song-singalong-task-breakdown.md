# SingBridge Task Breakdown

## 1. Success Criteria

MVP is ready for implementation when these documents exist:

- PRD: `foreign-song-singalong-prd.md`
- Technical design: `foreign-song-singalong-technical-design.md`
- Task breakdown: this document

MVP is ready for user validation when:

- `singbridge annotate input.txt --language ja --out song.json` works on fixtures.
- `singbridge export song.json --format markdown --out song.md` works.
- `singbridge validate song.json` works.
- Tests cover parsing, conversion, difficulty detection, export, and failure cases.
- 3-5 short user-provided Japanese lyric snippets can be converted into usable practice material.

## 2. Milestone 0: Project Setup

### T0.1 Create Workspace

Goal:

- Create the project repository and workspace structure.

Input:

- Empty project directory.

Output:

- `packages/core`
- `packages/cli`
- Optional placeholder `apps/web` only if desired; no WebUI implementation yet.

Boundary:

- No conversion behavior in this task.

Verification:

- Package manager install succeeds.
- `pnpm test` or equivalent placeholder command runs.

### T0.2 Configure TypeScript And Tests

Goal:

- Establish TypeScript and Vitest baseline.

Input:

- Workspace files.

Output:

- Shared TypeScript config.
- Vitest config.
- One minimal passing test.

Boundary:

- No product rules yet.

Verification:

- Type check passes.
- Test command passes.

## 3. Milestone 1: Core Text Pipeline

### T1.1 Define Annotation Schema

Goal:

- Implement the MVP project data model.

Input:

- Technical design data model.

Output:

- TypeScript types for `AnnotationProject`, `AnnotationLine`, `DifficultyNote`, overrides, and review reasons.
- Runtime validation helper.

Boundary:

- Only `language: "ja"` is valid in MVP.

Exceptions:

- Invalid JSON reports line/path-level errors where possible.

Verification:

- Unit tests for valid and invalid project objects.

### T1.2 Parse Plain Lyrics

Goal:

- Convert pasted or file lyrics into normalized line records.

Input:

- UTF-8 plain text.

Output:

- Ordered lines with IDs and indexes.

Boundary:

- Preserve blank lines.
- Do not infer song metadata.

Exceptions:

- Empty input returns a structured error.

Verification:

- Unit tests for plain text, blank lines, Japanese lines, and non-Japanese lines.

### T1.3 Parse Simple LRC-Like Input

Goal:

- Preserve timestamps from simple LRC-like lyrics.

Input:

- Lines like `[00:12.30]きっと忘れない`.

Output:

- Line records with `timestamp`.

Boundary:

- No audio sync.
- No multiple timestamps per line in MVP unless simple to support.

Exceptions:

- Malformed timestamp leaves line as plain text or returns a warning.

Verification:

- Unit tests for valid and malformed timestamps.

### T1.4 Generate Baseline Annotation JSON

Goal:

- Produce an annotation project with original lines and placeholder generated fields.

Input:

- Parsed lines.

Output:

- `AnnotationProject` JSON.

Boundary:

- Placeholder reading logic is acceptable until Japanese adapter is implemented.

Verification:

- Snapshot test for fixture input to JSON.

## 4. Milestone 2: Japanese Reading And Romaji

### T2.1 Implement Japanese Reading Adapter Interface

Goal:

- Create a replaceable interface for kana generation.

Input:

- Original Japanese line.

Output:

- Reading result with `kana`, `needsReview`, and review reasons.

Boundary:

- Adapter can initially handle kana-only lines and fixture phrases.
- Do not lock the system to one analyzer library.

Exceptions:

- Unknown kanji marks `needsReview`.

Verification:

- Unit tests for kana-only, kanji fixture, and unknown cases.

### T2.2 Implement Kana Normalization

Goal:

- Normalize katakana/hiragana and punctuation as needed for downstream rules.

Input:

- Reading string.

Output:

- Normalized kana string.

Boundary:

- Preserve information needed for long vowel marks.

Verification:

- Unit tests for hiragana, katakana, punctuation, and long mark `ー`.

### T2.3 Implement Kana-To-Romaji

Goal:

- Generate singing-friendly romaji.

Input:

- Kana string.

Output:

- Romaji string.

Boundary:

- MVP supports common hiragana/katakana, sokuon, youon, long vowels, and `ん`.

Exceptions:

- Unknown characters pass through or are marked without crashing.

Verification:

- Unit tests:
  - `きっと` -> `kitto`
  - `ありがとう` -> `arigatou`
  - `しゃしん` -> `shashin`
  - `ちょっと` -> expected singing-friendly romaji

## 5. Milestone 3: Chinese Pronunciation Aid And Difficulty Notes

### T3.1 Define Pronunciation Aid Mapping Rules

Goal:

- Implement first-pass `中文发音辅助`.

Input:

- Kana and romaji.

Output:

- `zhAssist`.

Boundary:

- Use hybrid romaji/pinyin-like chunks.
- Do not claim standard pronunciation.

Exceptions:

- Sounds without Mandarin equivalents keep romaji-like chunks and rely on notes.

Verification:

- Unit tests for common kana groups and edge sounds.

### T3.2 Represent Long Vowels And Sokuon

Goal:

- Make timing-sensitive sounds visible in `zhAssist`.

Input:

- Kana and romaji.

Output:

- `zhAssist` with visible long/short-stop markers.

Boundary:

- Choose a consistent MVP notation such as `to-o` and `t-to`.

Verification:

- Unit tests for `とう`, `えい`, `ー`, and small `っ`.

### T3.3 Detect Difficulty Notes

Goal:

- Add line-level notes for Chinese-user difficult sounds.

Input:

- Original, kana, romaji.

Output:

- `difficultyNotes`.

Rules:

- Long vowels.
- Small `っ`.
- 拗音.
- `ん`.
- `つ`, `ふ`, `し`, `ち`, `じ`.
- ら行.
- Voiced/semi-voiced sounds.

Verification:

- Unit tests for each rule.
- Snapshot test for a mixed difficult line.

### T3.4 Tune Note Copy

Goal:

- Make difficulty messages gentle, concise, and useful.

Input:

- Difficulty note types.

Output:

- Chinese note messages.

Boundary:

- Avoid overly academic explanations.
- Avoid harsh "wrong" language.

Verification:

- Manual review of sample Markdown output.

## 6. Milestone 4: CLI

### T4.1 Implement `annotate`

Goal:

- Create annotation JSON from input lyrics.

Input:

- `input.txt`
- `--language ja`
- `--out song.json`

Output:

- Project JSON file.

Exceptions:

- Empty input.
- Unsupported language.
- Unwritable output path.

Verification:

- CLI integration tests for success and failure paths.

### T4.2 Implement `validate`

Goal:

- Validate project JSON.

Input:

- `song.json`

Output:

- Success message or validation errors.

Exceptions:

- Invalid JSON.
- Missing required fields.
- Duplicate line IDs.

Verification:

- CLI tests for valid and invalid fixtures.

### T4.3 Implement `export`

Goal:

- Export practice material.

Input:

- Project JSON.
- Format: `markdown`, `json`, or `text`.

Output:

- Export file.

Verification:

- Snapshot tests for Markdown and text output.
- CLI test for invalid format.

### T4.4 CLI Help And Error Messages

Goal:

- Make CLI usable without reading source code.

Input:

- `singbridge --help`
- Invalid commands/arguments.

Output:

- Clear help text and actionable errors.

Verification:

- CLI tests check help includes commands and examples.
- Failure paths return non-zero exit codes.

## 7. Milestone 5: Manual Corrections

### T5.1 Apply Manual Overrides

Goal:

- Preserve user corrections.

Input:

- Project JSON with `manualOverrides`.

Output:

- Effective exported values use overrides.

Boundary:

- Manual values win over generated values.

Verification:

- Unit tests for overriding kana, romaji, `zhAssist`, and notes.

### T5.2 Correction Workflow

Goal:

- Support a CLI-friendly correction workflow.

Input:

- Edited project JSON.

Output:

- Validated corrected project.

Boundary:

- No interactive editor in MVP unless trivial.

Verification:

- Integration test with corrected fixture.

## 8. Milestone 6: Sample Validation

### T6.1 Create Fixture Set

Goal:

- Cover representative Japanese lyric patterns.

Input:

- Short user-provided or synthetic lines.

Output:

- Fixture input and expected outputs.

Boundary:

- Avoid committing copyrighted full lyrics.
- Use short snippets or synthetic examples.

Verification:

- All fixtures run through tests.

### T6.2 Manual Five-Snippet Test

Goal:

- Validate usefulness with realistic snippets.

Input:

- 3-5 short snippets.

Output:

- Notes on incorrect readings, confusing aids, missing difficulty rules.

Verification:

- Manual checklist completed.

### T6.3 Refine Rules

Goal:

- Improve MVP mappings based on fixture failures.

Input:

- Validation notes.

Output:

- Adjusted rules and updated tests.

Verification:

- Regression tests pass.

## 9. Milestone 7: WebUI Prototype, Deferred

Do not start this until CLI and fixtures are stable.

### T7.1 Load Fixture JSON

Goal:

- Display existing annotation JSON in Vue.

Input:

- Fixture project JSON.

Output:

- Read-only annotation view.

Verification:

- Playwright smoke test loads fixture and displays line layers.

Status:

- Implemented in `apps/web` as a Vue 3 + Vite read-only viewer.
- Loads the built-in annotation and correction draft fixtures by default.
- Displays original text, kana, romaji, Chinese pronunciation aid, difficulty notes, review reasons, and correction overlay information.

### T7.2 Load Local JSON Files

Goal:

- Load CLI-generated local project JSON and optional correction draft JSON.

Input:

- `song.json` annotation project.
- Optional `corrections.json` romaji correction draft.

Output:

- Read-only annotation view with optional correction overlay.

Boundary:

- Use browser File API only.
- Do not upload user lyrics.
- Do not execute CLI commands in the browser.
- Do not import tokenizer/runtime conversion logic into WebUI.

Verification:

- WebUI smoke test loads fixture data and exposes file controls.
- Unit tests validate accepted/rejected project and correction draft shapes.

Status:

- Implemented.
- Loading a new annotation project clears any previous correction overlay to avoid applying stale suggestions to a different project.
- Correction draft overlays show current kana, current romaji, reference romaji, suggested romaji, `suggestedKana: null`, review reasons, and manual review guidance.

### T7.3 CLI Command Helper

Goal:

- Help users generate CLI commands that produce WebUI-loadable JSON files.

Input:

- Local path strings for lyrics, project JSON, reference romaji, reports, correction drafts, and corrected output.

Output:

- Copyable PowerShell-friendly CLI commands.

Boundary:

- Generate command text only.
- Do not run commands from WebUI.
- Do not add a backend.

Verification:

- Unit tests cover command generation, disabled states, and PowerShell quoting for paths with spaces.

Status:

- Implemented in the WebUI as a lightweight helper panel.

### T7.4 Annotation Editor

Goal:

- Edit line-level fields.

Input:

- Project JSON.

Output:

- Updated local project state.

Verification:

- Component tests for editing and override preservation.

Status:

- Deferred. The current WebUI remains read-only.

### T7.5 Visual Direction

Goal:

- Apply Claude primary style and light Spotify active-state cues.

Input:

- Existing viewer/editor.

Output:

- Calm reading UI with selected-line highlight.

Verification:

- Desktop and mobile screenshots reviewed manually.

Status:

- Implemented for the current read-only viewer.
- `apps/web/Claude_DESIGN.md` is the primary style reference.
- `apps/web/Spotify_DESIGN.md` is used only for music/status cues such as active, warning, and mismatch states.

## 10. Recommended First Implementation Slice

Implement only these tasks first:

1. T0.1 Create Workspace
2. T0.2 Configure TypeScript And Tests
3. T1.1 Define Annotation Schema
4. T1.2 Parse Plain Lyrics
5. T1.4 Generate Baseline Annotation JSON
6. T4.1 Implement `annotate` with placeholder generated fields

This slice proves the project shape and CLI flow before any difficult Japanese conversion logic is added.

## 11. Definition Of Done For Each Task

Each task is done only when:

- The behavior is implemented.
- Tests or explicit verification commands exist.
- Error cases are handled where listed.
- No unrelated refactors are included.
- Documentation is updated if the data shape or command behavior changes.

## 12. Current Progress Log

### Completed In Current Implementation

- T0.1 workspace setup:
  - Added pnpm workspace, root package scripts, TypeScript base config, and `.gitignore`.
  - Created `packages/core` and `packages/cli`.
- T0.2 TypeScript and tests:
  - Added Vitest test coverage across core and CLI.
- T1.1 annotation schema:
  - Added TypeScript model types and runtime validation.
  - Validation now reports path-level errors for malformed lines, notes, and manual overrides.
- T1.2/T1.3 input parsing:
  - Plain text parsing works.
  - Simple LRC timestamps are preserved.
  - UTF-8 BOM is stripped.
  - Trailing newline no longer creates an extra lyric line.
- T1.4 baseline annotation:
  - Generates project JSON with line IDs, source metadata, review flags, generated layers, and manual override slots.
- T2.1 Japanese reading adapter:
  - Added offline `kuromoji` reading adapter.
  - Kanji-containing lines can now produce kana, romaji, Chinese pronunciation aid, and notes.
  - Kanji lines still retain `unknown_kanji_reading` for review.
- T2.2/T2.3 kana and romaji:
  - Katakana to hiragana normalization.
  - Kana-to-romaji for common kana, sokuon, youon, long vowels, `ん`, common foreign-sound katakana combinations, and `を -> wo`.
  - Reading-adapter romaji now includes word spacing when available.
- T3.1/T3.2/T3.3 pronunciation aid and difficulty notes:
  - Generates `中文发音辅助`.
  - Detects long vowels, small `っ`, youon, `ん`, `つ`, `ふ`, `し/ち/じ`, ra-row, voiced/semi-voiced sounds.
  - Deduplicates repeated same-message reminders in a line.
  - Preserves parenthesized Latin ad-libs such as `(Oh)`.
- T4 CLI:
  - `annotate`, `validate`, and `export` are implemented.
  - Export formats: Markdown, JSON, text.
  - CLI preserves non-Japanese lines for export.
- T5 manual corrections:
  - Manual overrides are validated.
  - Export uses manual overrides.
  - If only manual kana is provided, romaji, Chinese pronunciation aid, and notes are derived from that kana.
- T6 sample validation:
  - Added a synthetic fixture set.
  - Tested user-provided short lyric snippets.
  - Added sample-driven reading overrides for known lyric readings.
- Reference romaji comparison:
  - Added a CLI flow for comparing generated romaji against user-provided reference romaji.
  - Added Markdown comparison reports with exact match, format difference, reading mismatch, missing reference, and extra reference statuses.
  - Enhanced mismatch report lines with current kana, generated romaji, reference romaji, review reasons, and suggested action.
  - Added a project correction flow that applies reference romaji as `manualOverrides.romaji` without inferring kana or overwriting existing manual romaji.
  - Added a correction draft JSON flow for actionable romaji differences; `suggestedKana` stays `null` for manual review.
- Japanese reading dependency spike:
  - Added `japanese-reading-technical-spike.md` to compare `kuromoji`, `lindera-wasm`, and Python/Sudachi-style options.
- WebUI prototype:
  - Added `apps/web` with Vue 3 + Vite.
  - Added a read-only annotation viewer for annotation project JSON.
  - Added local file loading for `song.json` and optional `corrections.json`.
  - Added correction draft overlay review panels with current kana, current romaji, reference romaji, suggested romaji, `suggestedKana: null`, review reasons, and guidance.
  - Added a CLI command helper that generates copyable PowerShell commands without executing them.
  - Applied `Claude_DESIGN.md` as the primary visual system and `Spotify_DESIGN.md` only for status cues.

### Current Verification Commands

The following commands pass:

```text
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

WebUI-only commands:

```text
pnpm --filter @singbridge/web test
pnpm --filter @singbridge/web build
pnpm --filter @singbridge/web dev -- --host 127.0.0.1 --port 5173
```

New CLI usage:

```text
singbridge compare-romaji lyrics.txt --reference reference-romaji.txt --out report.md
singbridge apply-romaji-reference song.json --reference reference-romaji.txt --out corrected.json
singbridge draft-romaji-corrections song.json --reference reference-romaji.txt --out corrections.json
```

Current tests cover core parsing, schema validation, kana-to-romaji, reading adapter, Chinese pronunciation aid, difficulty detection, exports, CLI success/failure paths, manual corrections, UTF-8 BOM handling, reference romaji comparison, sample validation, WebUI file validation, WebUI command generation, and WebUI viewer filtering.

### Sample Findings

User-provided snippets exposed these important behaviors:

- Dictionary readings work for many ordinary kanji phrases:
  - `どうでもいいような 夜だけど` -> `dou demo ii you na yoru dakedo`
  - `まだ止まった 刻む針も` -> `mada tomatta kizamu hari mo`
  - `入り浸った 散らかる部屋も` -> `iribitatta chirakaru heya mo`
- Lyrics can use special readings that differ from dictionary output:
  - `響めき` should be treated as `どよめき` in the tested lyric.
  - `心魅かれてく` should be treated as `こころひかれてく`.
  - `景色` was reference-romaji aligned to `ばしょ` in the tested lyric.
- A non-Japanese user cannot reliably know whether generated kana is wrong. Manual kana editing is useful but not sufficient as the primary validation flow.

### Current Known Problems

- The small reading override list is hard-coded in `readingAdapter.ts`; this should not become the long-term mechanism.
- The product needs reference-romaji comparison so users can paste romaji found online and see whether generated output disagrees.
- Romaji spacing is currently heuristic and sample-driven.
- The current system does not infer timing from audio; all rhythm hints remain text-based.
- WebUI is implemented as a read-only prototype, not an editor.
- WebUI does not accept raw lyrics directly; raw lyrics still go through the CLI.

### Recommended Next Slice

Stabilize the read-only WebUI before adding editing:

1. Add focused WebUI smoke automation for local JSON loading where practical.
2. Improve correction overlay comparison readability based on user feedback.
3. Add documentation examples for the annotation JSON and correction draft JSON shapes.
4. Only after read-only flows are stable, consider a scoped manual correction editor.

This keeps the product aligned with CLI-first development while making the WebUI useful for reviewing CLI output.
