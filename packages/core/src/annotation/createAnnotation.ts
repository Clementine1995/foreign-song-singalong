import type { AnnotationLine, AnnotationProject, ReviewReason } from "../schema/annotation.js";
import type { ParsedLyricLine } from "../input/parseLyrics.js";
import { containsJapanese, containsKanji, isKanaOnlyJapanese, toHiragana } from "../japanese/kana.js";
import { kanaToRomaji } from "../japanese/kanaToRomaji.js";
import { generateKanaReading } from "../japanese/readingAdapter.js";
import { detectDifficultyNotes } from "../pronunciation/difficultyRules.js";
import { generateZhAssist } from "../pronunciation/zhAssist.js";

export interface CreateAnnotationOptions {
  inputFile?: string;
}

export function createAnnotationProject(
  lines: ParsedLyricLine[],
  options: CreateAnnotationOptions = {}
): AnnotationProject {
  return {
    version: 1,
    language: "ja",
    source: {
      type: options.inputFile ? "file_import" : "user_paste",
      note: "User-provided lyrics",
      ...(options.inputFile ? { inputFile: options.inputFile } : {})
    },
    settings: {
      pronunciationMode: "zh_assist",
      romajiStyle: "singing_friendly"
    },
    lines: lines.map(createAnnotationLine)
  };
}

export async function createAnnotationProjectWithReading(
  lines: ParsedLyricLine[],
  options: CreateAnnotationOptions = {}
): Promise<AnnotationProject> {
  return {
    version: 1,
    language: "ja",
    source: {
      type: options.inputFile ? "file_import" : "user_paste",
      note: "User-provided lyrics",
      ...(options.inputFile ? { inputFile: options.inputFile } : {})
    },
    settings: {
      pronunciationMode: "zh_assist",
      romajiStyle: "singing_friendly"
    },
    lines: await Promise.all(lines.map(createAnnotationLineWithReading))
  };
}

function createAnnotationLine(line: ParsedLyricLine): AnnotationLine {
  const original = line.original;
  const reviewReasons: ReviewReason[] = [];
  let reading: string | undefined;
  let kana: string | undefined;
  let romaji: string | undefined;
  let zhAssist: string | undefined;

  if (original.trim().length === 0) {
    reading = "";
    kana = "";
    romaji = "";
    zhAssist = "";
  } else if (!containsJapanese(original)) {
    reading = original;
    romaji = original;
    zhAssist = original;
    reviewReasons.push("non_japanese_line");
  } else if (isKanaOnlyJapanese(original)) {
    reading = toHiragana(original);
    kana = reading;
    romaji = kanaToRomaji(reading);
    zhAssist = generateZhAssist(reading);
  } else {
    reading = original;
    kana = original;
    romaji = "";
    zhAssist = "";
    reviewReasons.push(containsKanji(original) ? "unknown_kanji_reading" : "mixed_language_line");
  }

  return {
    id: line.id,
    index: line.index,
    ...(line.timestamp ? { timestamp: line.timestamp } : {}),
    original,
    ...(reading !== undefined ? { reading } : {}),
    ...(kana !== undefined ? { kana } : {}),
    ...(romaji !== undefined ? { romaji } : {}),
    ...(zhAssist !== undefined ? { zhAssist } : {}),
    difficultyNotes: kana ? detectDifficultyNotes(kana) : [],
    needsReview: reviewReasons.length > 0,
    reviewReasons,
    manualOverrides: {
      reading: null,
      kana: null,
      romaji: null,
      zhAssist: null,
      notes: []
    }
  };
}

async function createAnnotationLineWithReading(line: ParsedLyricLine): Promise<AnnotationLine> {
  const original = line.original;

  if (original.trim().length === 0 || !containsJapanese(original) || isKanaOnlyJapanese(original)) {
    return createAnnotationLine(line);
  }

  try {
    const reading = await generateKanaReading(original);
    const kana = reading.kana;
    return buildAnnotationLine(line, kana, kana, reading.romaji, generateZhAssist(kana), reading.reviewReasons);
  } catch {
    return buildAnnotationLine(line, original, original, "", "", ["reading_adapter_unavailable"]);
  }
}

function buildAnnotationLine(
  line: ParsedLyricLine,
  reading: string | undefined,
  kana: string | undefined,
  romaji: string | undefined,
  zhAssist: string | undefined,
  reviewReasons: ReviewReason[]
): AnnotationLine {
  return {
    id: line.id,
    index: line.index,
    ...(line.timestamp ? { timestamp: line.timestamp } : {}),
    original: line.original,
    ...(reading !== undefined ? { reading } : {}),
    ...(kana !== undefined ? { kana } : {}),
    ...(romaji !== undefined ? { romaji } : {}),
    ...(zhAssist !== undefined ? { zhAssist } : {}),
    difficultyNotes: kana ? detectDifficultyNotes(kana) : [],
    needsReview: reviewReasons.length > 0,
    reviewReasons,
    manualOverrides: {
      reading: null,
      kana: null,
      romaji: null,
      zhAssist: null,
      notes: []
    }
  };
}
