# Pronunciation Validation Samples

These cases validate SingBridge's Chinese pronunciation aid and difficulty notes with short title phrases from user-named songs.

They are intentionally short and are not lyric archives. For private full-song checks, put local files under `.local-song-validation/`; that directory is ignored by git.

## Cases

| Case | Reference | Focus |
| --- | --- | --- |
| `sekai-particle-wa` | 直到世界尽头 | Particle `は -> wa`, ra-row and voiced-sound notes. |
| `dan-dan-ra-row` | 渐渐被你吸引 | Existing title reading override and ra-row reminders. |
| `boku-sokuon-long-vowel` | 曾经我也想一了百了 | Long vowel, sokuon, shi, voiced sounds. |

## Private Full-Song Check

Use this ignored local layout when you want to test full lyrics on this machine:

```text
.local-song-validation/
  sekai-ga-owaru-made-wa/lyrics.txt
  dan-dan-kokoro-hikareteku/lyrics.txt
  boku-ga-shinou-to-omotta-no-wa/lyrics.txt
```

Example command:

```text
pnpm --filter @singbridge/cli build
node packages/cli/dist/index.js annotate .local-song-validation/sekai-ga-owaru-made-wa/lyrics.txt --language ja --out .local-song-validation/sekai-ga-owaru-made-wa/song.json
node packages/cli/dist/index.js export .local-song-validation/sekai-ga-owaru-made-wa/song.json --format markdown --out .local-song-validation/sekai-ga-owaru-made-wa/song.md
```
