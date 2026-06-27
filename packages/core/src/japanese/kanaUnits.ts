export interface KanaUnit {
  kana: string;
  romaji: string;
  length: number;
}

const baseRomaji: Record<string, string> = {
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
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  を: "wo",
  ん: "n",
  ゔ: "vu"
};

const comboRomaji: Record<string, string> = {
  きゃ: "kya",
  きゅ: "kyu",
  きょ: "kyo",
  ぎゃ: "gya",
  ぎゅ: "gyu",
  ぎょ: "gyo",
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
  びゃ: "bya",
  びゅ: "byu",
  びょ: "byo",
  ぴゃ: "pya",
  ぴゅ: "pyu",
  ぴょ: "pyo",
  みゃ: "mya",
  みゅ: "myu",
  みょ: "myo",
  りゃ: "rya",
  りゅ: "ryu",
  りょ: "ryo",
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

export function readKanaUnit(chars: string[], index: number): KanaUnit {
  const twoChars = `${chars[index] ?? ""}${chars[index + 1] ?? ""}`;
  const combo = comboRomaji[twoChars];
  if (combo) {
    return { kana: twoChars, romaji: combo, length: 2 };
  }

  const char = chars[index] ?? "";
  return {
    kana: char,
    romaji: baseRomaji[char] ?? char,
    length: 1
  };
}

export function startsWithConsonant(romaji: string): boolean {
  return /^[bcdfghjklmnpqrstvwxyz]/.test(romaji);
}

export function firstRomajiConsonant(romaji: string): string {
  if (romaji.startsWith("ch")) {
    return "t";
  }
  if (romaji.startsWith("sh")) {
    return "s";
  }
  if (romaji.startsWith("ts")) {
    return "t";
  }
  return startsWithConsonant(romaji) ? romaji[0] : "";
}

export function lastVowel(romaji: string): string {
  const match = romaji.match(/[aeiou](?!.*[aeiou])/);
  return match?.[0] ?? "";
}
