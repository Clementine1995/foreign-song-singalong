import { firstRomajiConsonant, lastVowel, readKanaUnit } from "../japanese/kanaUnits.js";
import { toHiragana } from "../japanese/kana.js";

const zhUnitMap: Record<string, string> = {
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  が: "ga",
  ぎ: "gi",
  ぐ: "gu",
  げ: "ge",
  ご: "go",
  さ: "sa",
  し: "shi",
  す: "su",
  せ: "se",
  そ: "so",
  ざ: "za",
  じ: "ji",
  ず: "zu",
  ぜ: "ze",
  ぞ: "zo",
  た: "ta",
  ち: "chi",
  つ: "tsu",
  て: "te",
  と: "to",
  だ: "da",
  ぢ: "ji",
  づ: "zu",
  で: "de",
  ど: "do",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "fu",
  へ: "he",
  ほ: "ho",
  ば: "ba",
  び: "bi",
  ぶ: "bu",
  べ: "be",
  ぼ: "bo",
  ぱ: "pa",
  ぴ: "pi",
  ぷ: "pu",
  ぺ: "pe",
  ぽ: "po",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "la/ra",
  り: "li/ri",
  る: "lu/ru",
  れ: "le/re",
  ろ: "lo/ro",
  わ: "wa",
  を: "o",
  ん: "n",
  きゃ: "kya",
  きゅ: "kyu",
  きょ: "kyo",
  しゃ: "sha",
  しゅ: "shu",
  しょ: "sho",
  じゃ: "ja",
  じゅ: "ju",
  じょ: "jo",
  ちゃ: "cha",
  ちゅ: "chu",
  ちょ: "cho",
  にゃ: "nya",
  にゅ: "nyu",
  にょ: "nyo",
  ひゃ: "hya",
  ひゅ: "hyu",
  ひょ: "hyo",
  みゃ: "mya",
  みゅ: "myu",
  みょ: "myo",
  りゃ: "lya/rya",
  りゅ: "lyu/ryu",
  りょ: "lyo/ryo",
  うぃ: "wi",
  うぇ: "we",
  うぉ: "wo",
  ゔぁ: "va",
  ゔぃ: "vi",
  ゔぇ: "ve",
  ゔぉ: "vo",
  ふぁ: "fa",
  ふぃ: "fi",
  ふぇ: "fe",
  ふぉ: "fo",
  てぃ: "ti",
  でぃ: "di",
  とぅ: "tu",
  どぅ: "du"
};

export function generateZhAssist(input: string): string {
  const chars = Array.from(toHiragana(input));
  const chunks: string[] = [];

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];

    if (/[A-Za-z0-9]/.test(char)) {
      const latin = readLatinChunk(chars, index);
      chunks.push(latin.text);
      index += latin.length - 1;
      continue;
    }

    if (char === "っ") {
      const next = readKanaUnit(chars, index + 1);
      const nextZh = zhForKana(next.kana, next.romaji);
      const consonant = firstRomajiConsonant(next.romaji);
      chunks.push(consonant ? `${consonant}-${nextZh}` : "[停半拍]");
      index += next.length;
      continue;
    }

    if (char === "ー") {
      extendPreviousChunk(chunks);
      continue;
    }

    const unit = readKanaUnit(chars, index);
    const nextChar = chars[index + unit.length];
    const zh = zhForKana(unit.kana, unit.romaji);

    if (nextChar && isLongVowelPair(unit.romaji, nextChar)) {
      chunks.push(`${zh}-${lastVowel(unit.romaji)}`);
      index += unit.length;
      continue;
    }

    chunks.push(zh);
    index += unit.length - 1;
  }

  return chunks
    .join(" ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+([、。,.!?！？])/g, "$1")
    .trim();
}

function zhForKana(kana: string, romaji: string): string {
  return zhUnitMap[kana] ?? romaji;
}

function isLongVowelPair(romaji: string, nextChar: string): boolean {
  const vowel = lastVowel(romaji);
  return (
    (vowel === "o" && nextChar === "う") ||
    (vowel === "e" && nextChar === "い") ||
    nextChar === vowelToKana(vowel)
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

function extendPreviousChunk(chunks: string[]): void {
  const previous = chunks.at(-1);
  if (!previous) {
    return;
  }
  const vowel = lastVowel(previous);
  chunks[chunks.length - 1] = vowel ? `${previous}-${vowel}` : `${previous}-`;
}

function readLatinChunk(chars: string[], start: number): { text: string; length: number } {
  let end = start;
  while (end < chars.length && /[A-Za-z0-9]/.test(chars[end])) {
    end += 1;
  }

  return {
    text: chars.slice(start, end).join(""),
    length: end - start
  };
}
