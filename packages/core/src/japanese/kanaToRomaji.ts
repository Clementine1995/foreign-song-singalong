import { firstRomajiConsonant, lastVowel, readKanaUnit, startsWithConsonant } from "./kanaUnits.js";
import { toHiragana } from "./kana.js";

export function kanaToRomaji(input: string): string {
  const chars = Array.from(toHiragana(input));
  const parts: string[] = [];

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];

    if (char === "っ") {
      const next = readKanaUnit(chars, index + 1);
      parts.push(firstRomajiConsonant(next.romaji));
      continue;
    }

    if (char === "ー") {
      const previous = parts.at(-1);
      if (previous) {
        parts[parts.length - 1] = `${previous}${lastVowel(previous)}`;
      }
      continue;
    }

    const unit = readKanaUnit(chars, index);
    let romaji = unit.romaji;

    if (romaji === "n") {
      const next = readKanaUnit(chars, index + 1);
      if (/^[aiueoy]/.test(next.romaji)) {
        romaji = "n'";
      }
    }

    parts.push(romaji);
    index += unit.length - 1;
  }

  return joinRomaji(parts);
}

function joinRomaji(parts: string[]): string {
  return parts.reduce((result, part) => {
    if (result.length === 0) {
      return part;
    }
    if (part.length === 1 && startsWithConsonant(part)) {
      return `${result}${part}`;
    }
    if (/^\s+$/.test(part) || /^[、。,.!?！？]$/.test(part)) {
      return `${result}${part}`;
    }
    return `${result}${part}`;
  }, "");
}
