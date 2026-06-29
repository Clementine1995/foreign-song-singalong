import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import kuromoji from "kuromoji";
import type { ReviewReason } from "../schema/annotation.js";
import { containsJapanese, containsKanji, isKanaOnlyJapanese, normalizeJapaneseText, toHiragana } from "./kana.js";
import { kanaToRomaji } from "./kanaToRomaji.js";
import { lastVowel } from "./kanaUnits.js";

interface KuromojiToken {
  surface_form: string;
  reading?: string;
  pos?: string;
  word_type?: string;
}

interface ReadingPart {
  kana: string;
  romajiOverride?: string;
}

export interface ReadingAdapterResult {
  kana: string;
  romaji: string;
  reviewReasons: ReviewReason[];
}

let tokenizerPromise: Promise<kuromoji.Tokenizer<KuromojiToken>> | undefined;

export async function generateKanaReading(input: string): Promise<ReadingAdapterResult> {
  const normalized = normalizeJapaneseText(input);
  const readingText = applyLyricReadingOverrides(normalized);
  const tokenizer = await getTokenizer();
  const reviewReasons = new Set<ReviewReason>();
  const readingParts = tokenizeReadingParts(readingText, tokenizer, reviewReasons);
  const kana = readingParts.map((part) => part.kana).join("");

  if (containsKanji(normalized)) {
    reviewReasons.add("unknown_kanji_reading");
  }

  return {
    kana: toHiragana(kana),
    romaji: normalizeRomajiSpacing(mergeKanaPartsForRomaji(readingParts).map(partToRomaji).join(" ")),
    reviewReasons: [...reviewReasons]
  };
}

function applyLyricReadingOverrides(text: string): string {
  return text
    .replaceAll("響めき", "どよめき")
    .replaceAll("心魅かれてく", "こころひかれてく")
    .replaceAll("暗闇", "やみ")
    .replaceAll("想ってた", "おもっていた")
    .replaceAll("景色", "ばしょ");
}

function tokenizeReadingParts(
  text: string,
  tokenizer: kuromoji.Tokenizer<KuromojiToken>,
  reviewReasons: Set<ReviewReason>
): ReadingPart[] {
  const segments = text.match(/\S+/g) ?? [];
  return segments.flatMap((segment) => tokenizer.tokenize(segment).map((token) => tokenToReadingPart(token, reviewReasons)));
}

function mergeKanaPartsForRomaji(parts: ReadingPart[]): ReadingPart[] {
  const merged: ReadingPart[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const current = parts[index];
    const next = parts[index + 1];

    if (next && toHiragana(current.kana).endsWith("っ")) {
      merged.push({ kana: `${current.kana}${next.kana}` });
      index += 1;
      continue;
    }

    if (next && toHiragana(current.kana) === "だ" && toHiragana(next.kana) === "けど") {
      merged.push({ kana: `${current.kana}${next.kana}` });
      index += 1;
      continue;
    }

    if (next && isLongVowelContinuation(current.kana, next.kana)) {
      merged.push({ kana: `${current.kana}${next.kana}` });
      index += 1;
      continue;
    }

    merged.push(current);
  }

  return merged;
}

function partToRomaji(part: ReadingPart): string {
  return part.romajiOverride ?? kanaToRomaji(toHiragana(part.kana));
}

function isLongVowelContinuation(current: string, next: string): boolean {
  const currentRomaji = kanaToRomaji(toHiragana(current));
  const vowel = lastVowel(currentRomaji);
  const nextKana = toHiragana(next);
  return (
    (vowel === "o" && nextKana === "う") ||
    (vowel === "e" && nextKana === "い") ||
    nextKana === vowelToKana(vowel)
  );
}

function vowelToKana(vowel: string): string {
  const kanaByVowel: Record<string, string> = {
    a: "あ",
    i: "い",
    u: "う",
    e: "え",
    o: "お"
  };
  return kanaByVowel[vowel] ?? "";
}

function normalizeRomajiSpacing(romaji: string): string {
  return romaji
    .replace(/\bhate nai\b/g, "hatenai")
    .replace(/\bhikare te ku\b/g, "hikareteku")
    .replace(/\bomotte i ta\b/g, "omotte ita")
    .replace(/\bba sho\b/g, "basho")
    .replace(/\bomoidashi ta\b/g, "omoidashita")
    .replace(/\bn da\b/g, "n'da")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+([、。,.!?！？])/g, "$1");
}

function tokenToReadingPart(token: KuromojiToken, reviewReasons: Set<ReviewReason>): ReadingPart {
  const romajiOverride = token.surface_form === "は" && token.pos === "助詞" ? "wa" : undefined;

  if (token.reading) {
    return { kana: token.reading, ...(romajiOverride ? { romajiOverride } : {}) };
  }

  if (isKanaOnlyJapanese(token.surface_form)) {
    return { kana: token.surface_form, ...(romajiOverride ? { romajiOverride } : {}) };
  }

  if (containsKanji(token.surface_form)) {
    reviewReasons.add("unknown_kanji_reading");
  } else if (containsJapanese(token.surface_form)) {
    reviewReasons.add("mixed_language_line");
  }

  return { kana: token.surface_form, ...(romajiOverride ? { romajiOverride } : {}) };
}

async function getTokenizer(): Promise<kuromoji.Tokenizer<KuromojiToken>> {
  tokenizerPromise ??= new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: dictionaryPath() }).build((error, tokenizer) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(tokenizer);
    });
  });

  return tokenizerPromise;
}

function dictionaryPath(): string {
  const require = createRequire(import.meta.url);
  return join(dirname(require.resolve("kuromoji")), "..", "dict");
}
