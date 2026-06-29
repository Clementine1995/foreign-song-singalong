# Case: 世界が終るまでは

Song reference: "直到世界尽头".

This case is intentionally limited to the short title phrase. It tests the common singing-romaji preference of writing the final `は` particle as `wa`.

Expected behavior:

- `draft-romaji-corrections` creates zero corrections after the token-aware particle rule.
- Exported Markdown keeps `Romaji：sekai ga owaru made wa`.
- Kana remains `せかいがおわるまでは`; the rule only affects romaji.
