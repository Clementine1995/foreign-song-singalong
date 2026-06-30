# Case: 紅蓮華

Song reference: "红莲华".

This case is intentionally limited to the short title phrase. It records a real kanji-reading mismatch without committing full lyrics.

Expected behavior:

- The current reading adapter generates `guren hana` from `紅蓮華`.
- `draft-romaji-corrections` creates one `reading_mismatch` against reference `gurenge`.
- The correction keeps `suggestedKana: null` because kana should be filled only after manual verification.
- The sample decision ignores the correction, so applying decisions does not write a romaji or kana override.
