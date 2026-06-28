# SingBridge WebUI

Vue 3 + Vite read-only viewer for CLI-generated SingBridge annotation JSON.

## Scope

This WebUI is intentionally small:

- Loads built-in fixture data by default.
- Loads local annotation project JSON files such as `song.json`.
- Optionally loads local romaji correction draft JSON files such as `corrections.json`.
- Shows correction overlays with current kana, current romaji, reference romaji, suggested romaji, `suggestedKana: null`, review reasons, and manual review guidance.
- Generates copyable CLI commands for the existing CLI workflow.

It does not:

- Accept raw lyrics directly.
- Run `kuromoji` or any tokenizer in the browser.
- Execute CLI commands.
- Edit or save project JSON.
- Upload lyrics or project files.

## Run

```text
pnpm --filter @singbridge/web dev -- --host 127.0.0.1 --port 5173
```

Then open:

```text
http://127.0.0.1:5173/
```

## Generate JSON With The CLI

Create an annotation project:

```text
singbridge annotate lyrics.txt --language ja --out song.json
```

Optional reference-romaji comparison:

```text
singbridge compare-romaji lyrics.txt --reference reference-romaji.txt --out romaji-report.md
```

Optional correction draft for WebUI overlay:

```text
singbridge draft-romaji-corrections song.json --reference reference-romaji.txt --out corrections.json
```

Optional corrected project JSON:

```text
singbridge apply-romaji-reference song.json --reference reference-romaji.txt --out corrected.json
```

## Load JSON

In the WebUI:

1. Use `选择标注 JSON` to load `song.json`.
2. Use `加载修正建议 JSON` to load `corrections.json`.
3. Use `全部`, `需复核`, and `修正建议` to filter lines.

Loading a new annotation project clears the previous correction overlay so stale suggestions are not shown against a different song.

## Design References

- `Claude_DESIGN.md` is the primary design reference.
- `Spotify_DESIGN.md` is used only for status cues such as active, warning, correction, and mismatch states.

The WebUI should remain a quiet reading and review tool, not a marketing page or a full editor.

## Verification

```text
pnpm --filter @singbridge/web test
pnpm --filter @singbridge/web build
```

For browser smoke checks, see `SMOKE.md`.
