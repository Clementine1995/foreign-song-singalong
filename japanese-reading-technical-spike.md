# Japanese Reading Dependency Spike

## Goal

Choose a practical Japanese reading adapter strategy for SingBridge without letting one tokenizer leak into product logic.

Current decision:

- Keep `packages/core/src/japanese/readingAdapter.ts` as the boundary.
- Treat `kuromoji` as a temporary baseline, not a long-term product bet.
- Prioritize reference-romaji comparison because it helps non-Japanese users catch wrong readings with data they can often find online.

## Evaluation Criteria

Scores use 1-5, where 5 is best for this project.

| Option | Windows install | Offline local use | Reading quality | Package/runtime weight | Maintenance | Fit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `kuromoji` | 5 | 5 | 3 | 4 | 1 | 3 |
| `lindera-wasm-ipadic-nodejs` | 4 | 5 | 3 | 3 | 5 | 3 |
| Python + SudachiPy/fugashi | 2 | 5 | 4 | 2 | 4 | 3 |

## Option Notes

### `kuromoji`

Current package:

- `kuromoji@0.1.2`
- latest published version: `0.1.2`
- version publish date from npm metadata: `2018-03-19`

Pros:

- Already integrated.
- Works offline.
- Low-friction on Windows because it is a normal npm dependency.
- Produces useful baseline readings for many ordinary kanji lines.

Cons:

- Stale package and stale dependencies.
- Dictionary readings are not enough for song lyrics with special readings.
- Should not become a growing pile of hard-coded lyric overrides.

Decision:

- Keep for now behind `readingAdapter`.
- Do not expand hard-coded lyric overrides except for tightly scoped sample validation.

### `lindera-wasm-ipadic-nodejs`

Observed package:

- `lindera-wasm-ipadic-nodejs@2.3.4`
- npm metadata modified in 2026
- unpacked size from npm metadata: about 17.8 MB
- official README supports Node.js usage with `TokenizerBuilder` and `embedded://ipadic`

Pros:

- More actively maintained than `kuromoji`.
- Runs in a local offline Node workflow after install.
- Embeds IPADIC, so the spike does not need a separate dictionary download.
- Potentially cleaner long-term adapter candidate.

Cons:

- Does not solve lyric-specific special readings by itself.
- Heavier dependency than `kuromoji`.
- Would still need the same reference-romaji and manual correction workflow.

Decision:

- Keep as a viable replacement candidate for maintenance reasons.
- Do not replace `kuromoji` yet because the fixture comparison did not show a reading-quality win.

### Python + SudachiPy/fugashi

Pros:

- Mature Japanese NLP ecosystem.
- Potentially better dictionary and reading behavior.
- Good fallback if Node ecosystem options are weak.

Cons:

- Adds a second runtime to a Node/TypeScript CLI.
- Windows install and packaging are heavier.
- Harder to reuse directly in a future Vue/Vite path.

Decision:

- Keep as a fallback option if Node/WASM candidates fail quality checks.
- Avoid introducing it before MVP comparison workflow is validated.

## Next Spike Task

Before replacing `kuromoji`, create a deeper fixture-driven comparison:

1. Use the existing sample fixture plus 3-5 short user-provided lyric snippets.
2. Run current `kuromoji` adapter output.
3. Run `lindera-wasm-ipadic-nodejs` prototype output if it exposes usable readings.
4. Compare both against reference romaji with the new comparison command.
5. Record mismatches, install friction, package size, and runtime initialization time.

Replacement threshold:

- `lindera-wasm-ipadic-nodejs` must install cleanly on Windows.
- It must run fully offline.
- It must produce readings at least as useful as the current adapter on the fixture set.
- It must not force conversion logic outside `readingAdapter`.

If those checks fail, keep `kuromoji` as the temporary baseline and rely on reference-romaji comparison plus manual correction.

## 2026-06-27 Spike Result

Docs and metadata checked:

- Official Lindera WASM README from the npm package.
- npm metadata for `lindera-wasm`, `lindera-wasm-web`, `lindera-wasm-bundler`, and `lindera-wasm-ipadic-nodejs`.

Important package finding:

- The package best suited for a Node CLI is `lindera-wasm-ipadic-nodejs`, not the bare `lindera-wasm` package.
- The Node/IPADIC package has an embedded dictionary and can be used with:

```js
import { TokenizerBuilder } from "lindera-wasm-ipadic-nodejs";

const builder = new TokenizerBuilder();
builder.setDictionary("embedded://ipadic");
builder.setMode("normal");
const tokenizer = builder.build();
```

Local Windows spike:

- Temporary install in `%TEMP%` succeeded.
- No project dependency was added.
- Tokenization worked with `embedded://ipadic`.
- `details[7]` contained katakana readings for IPADIC tokens.
- Basic runtime measurement:
  - Lindera init: about 145 ms.
  - Lindera tokenizing 100 short lines: about 1 ms.
  - Current `kuromoji` adapter init: about 144 ms.
  - Current `kuromoji` adapter processing 100 short lines: about 6 ms.

Fixture comparison:

| Sample | Current adapter kana | Lindera kana | Result |
| --- | --- | --- | --- |
| `忘れない` | `わすれない` | `わすれない` | Same |
| `どうでもいいような 夜だけど` | `どうでもいいようなよるだけど` | `どうでもいいようなよるだけど` | Same |
| `まだ止まった 刻む針も` | `まだとまったきざむはりも` | `まだとまったきざむはりも` | Same |
| `入り浸った 散らかる部屋も` | `いりびたったちらかるへやも` | `いりびたったちらかるへやも` | Same |
| `響めき` | `どよめき` | `ひびきめき` | Current adapter is better for tested lyric reading because of an override |
| `心魅かれてく` | `こころひかれてく` | `こころみかれてく` | Current adapter is better for tested lyric reading because of an override |
| `暗闇` | `やみ` | `くらやみ` | Current adapter is better for tested lyric reading because of an override |
| `景色` | `ばしょ` | `けしき` | Current adapter is better for tested lyric reading because of an override |

Conclusion:

- Lindera is healthier from a maintenance perspective and works locally on Windows.
- It does not produce better readings on the current lyric-specific fixture set.
- It should not replace `kuromoji` yet.
- The next product investment should remain reference-romaji comparison and a cleaner correction/alignment mechanism, not another tokenizer swap.
