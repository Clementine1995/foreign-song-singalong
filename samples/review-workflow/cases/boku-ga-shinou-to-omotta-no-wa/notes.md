# Case: 僕が死のうと思ったのは

Song reference: "曾经我也想一了百了".

This case is intentionally limited to the short title phrase. It tests the same final `は` particle issue in a different title phrase.

Expected behavior:

- `draft-romaji-corrections` creates zero corrections after the token-aware particle rule.
- Exported Markdown keeps `Romaji：boku ga shinou to omotta no wa`.
- Kana remains `ぼくがしのうとおもったのは`; the rule only affects romaji.
