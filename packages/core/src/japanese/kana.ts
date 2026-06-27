const japanesePattern = /[\u3040-\u30ff\u3400-\u9fff]/;
const kanjiPattern = /[\u3400-\u9fff]/;
const kanaPattern = /[\u3040-\u30ff]/;

export function containsJapanese(text: string): boolean {
  return japanesePattern.test(text);
}

export function containsKanji(text: string): boolean {
  return kanjiPattern.test(text);
}

export function isKanaOnlyJapanese(text: string): boolean {
  const japaneseChars = Array.from(text).filter((char) => containsJapanese(char));
  return japaneseChars.length > 0 && japaneseChars.every((char) => kanaPattern.test(char));
}

export function toHiragana(text: string): string {
  return Array.from(text)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 0x30a1 && code <= 0x30f6) {
        return String.fromCharCode(code - 0x60);
      }
      return char;
    })
    .join("");
}

export function normalizeJapaneseText(text: string): string {
  return text.normalize("NFKC").replaceAll("针", "針");
}
