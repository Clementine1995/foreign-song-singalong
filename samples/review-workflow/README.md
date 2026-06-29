# Review Workflow Sample

This sample is synthetic and intentionally short. It demonstrates the current local review loop without committing generated song JSON.

## Files

- `lyrics.txt`: short Japanese input.
- `reference-romaji.txt`: one reference romaji line per lyric line.
- `review-decisions.accept-format-only.json`: example WebUI export after ignoring the reading mismatch and accepting the format-only suggestion.
- `cases/`: short title-phrase cases for user-named songs.

## Reproduce

Run from the repository root:

```text
pnpm --filter @singbridge/core build
pnpm --filter @singbridge/cli build
node packages/cli/dist/index.js annotate samples/review-workflow/lyrics.txt --language ja --out .tmp/review-workflow/song.json
node packages/cli/dist/index.js compare-romaji samples/review-workflow/lyrics.txt --reference samples/review-workflow/reference-romaji.txt --out .tmp/review-workflow/romaji-report.md
node packages/cli/dist/index.js draft-romaji-corrections .tmp/review-workflow/song.json --reference samples/review-workflow/reference-romaji.txt --out .tmp/review-workflow/corrections.json
```

Then load `.tmp/review-workflow/song.json` and `.tmp/review-workflow/corrections.json` in the WebUI.

Expected review:

- `きっと忘れない` is a reading mismatch against `wasuremasen`, so it should stay manual-review first. The sample decision ignores it.
- `ありがとう` differs only by formatting from `A RI GA TO U`, so the sample decision accepts it.

Apply the sample decisions back to the project:

```text
node packages/cli/dist/index.js apply-review-decisions .tmp/review-workflow/song.json --decisions samples/review-workflow/review-decisions.accept-format-only.json --out .tmp/review-workflow/reviewed.json
node packages/cli/dist/index.js export .tmp/review-workflow/reviewed.json --format markdown --out .tmp/review-workflow/reviewed.md
```

Expected CLI result:

- The accepted format-only decision writes `manualOverrides.romaji = "A RI GA TO U"` for `ありがとう`.
- The ignored reading mismatch for `きっと忘れない` leaves the project unchanged.
- Exported Markdown uses `A RI GA TO U` for the accepted line.

Automated coverage:

- `packages/cli/src/index.test.ts` runs this sample end to end.
- The test verifies comparison summary counts, correction draft shape, review decision application, Markdown export, and the rule that accepted decisions write only `manualOverrides.romaji`.

Boundary:

- The WebUI export records review decisions only.
- It does not modify `song.json`.
- It does not infer kana from romaji.
- The CLI applies only accepted `suggestedRomaji` values.
- Existing manual romaji overrides are preserved.
- Full private lyrics belong in `.local-song-validation/`; committed samples should remain synthetic or short snippets.

## Song Title Phrase Cases

The `cases/` directory keeps each example intentionally short and copyright-safe. These are validation snippets, not lyric archives.

| Case | User-facing reference | Expected finding |
| --- | --- | --- |
| `sekai-ga-owaru-made-wa` | 直到世界尽头 | Final `は` is generated as singing-style `wa`; no correction is generated. |
| `dan-dan-kokoro-hikareteku` | 渐渐被你吸引 | Existing reading override matches the reference romaji; no correction is generated. |
| `boku-ga-shinou-to-omotta-no-wa` | 曾经我也想一了百了 | Final `は` is generated as singing-style `wa`; no correction is generated. |

These cases are covered by the CLI test suite. They currently validate the review-decision loop rather than proving a tokenizer replacement is needed.
