# WebUI Smoke Checks

Use this checklist for the read-only WebUI prototype. It covers the current phase only: local JSON loading, correction overlay review, and narrow-screen layout.

## Automated Checks

Run:

```text
pnpm --filter @singbridge/web test
pnpm --filter @singbridge/web build
```

The Vitest suite covers:

- Annotation project JSON validation.
- Correction draft JSON validation.
- Local annotation project loading clears stale correction overlays.
- Local correction draft loading merges into the current project.
- Correction overlay mapping by `lineId`.
- `全部` / `需复核` / `修正建议` filtering.
- CLI command generation and PowerShell path quoting.

## Browser Smoke

Start the dev server:

```text
pnpm --filter @singbridge/web dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://127.0.0.1:5173/
```

Desktop checks:

- Built-in fixture loads by default.
- `选择标注 JSON` and `加载修正建议 JSON` buttons are visible.
- Source strip shows the loaded annotation and correction files.
- `修正建议` filter shows only correction lines.
- Each correction overlay shows:
  - current kana,
  - current romaji,
  - reference romaji,
  - suggested romaji,
  - `suggestedKana: null`,
  - review reasons,
  - manual review guidance.
- CLI helper shows four copyable commands.

Narrow-screen checks at about 390px width:

- No horizontal page overflow.
- File buttons stack to full width.
- CLI path inputs collapse to one column.
- Correction comparison fields collapse to one column.
- `修正建议` still shows the two fixture correction overlays.

## Latest Manual Smoke Result

The latest checked state passed:

- Desktop: 4 fixture lines, 2 correction overlays, 8 overlay comparison cells, 2 file inputs, CLI helper visible.
- Narrow 390px: no horizontal overflow; file buttons, CLI fields, and overlay comparison collapse correctly.
