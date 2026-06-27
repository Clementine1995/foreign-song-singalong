export interface ParsedLyricLine {
  id: string;
  index: number;
  timestamp?: string;
  original: string;
}

export interface ParseLyricsResult {
  lines: ParsedLyricLine[];
}

export function parseLyrics(input: string): ParseLyricsResult {
  if (input.trim().length === 0) {
    throw new Error("input is empty");
  }

  const normalized = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");
  if (rawLines.at(-1) === "") {
    rawLines.pop();
  }

  return {
    lines: rawLines.map((rawLine, index) => {
      const parsed = parseLrcLine(rawLine);
      return {
        id: `line-${String(index + 1).padStart(3, "0")}`,
        index,
        timestamp: parsed.timestamp,
        original: parsed.text
      };
    })
  };
}

function parseLrcLine(line: string): { timestamp?: string; text: string } {
  const match = line.match(/^\[(\d{2}:\d{2}(?:\.\d{1,3})?)\](.*)$/);
  if (!match) {
    return { text: line };
  }

  return {
    timestamp: match[1],
    text: match[2]
  };
}
