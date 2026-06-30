# Case: guidance risk categories

This synthetic case keeps the review guidance evidence small and independent from kanji reading quality.

Expected behavior:

- `さよなら` against `SA YO NA RA` creates a `format_difference` correction and can be accepted as a style preference.
- `またね` against `matte` creates a `reading_mismatch` correction and should not be accepted without manual kana review.
- Applying the sample decisions writes only `manualOverrides.romaji = "SA YO NA RA"` for the first line.
