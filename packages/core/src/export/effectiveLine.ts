import type { AnnotationLine, DifficultyNote } from "../schema/annotation.js";
import { kanaToRomaji } from "../japanese/kanaToRomaji.js";
import { detectDifficultyNotes } from "../pronunciation/difficultyRules.js";
import { generateZhAssist } from "../pronunciation/zhAssist.js";

export interface EffectiveAnnotationLine {
  original: string;
  reading?: string;
  kana?: string;
  romaji?: string;
  zhAssist?: string;
  difficultyNotes: DifficultyNote[];
}

export function getEffectiveLine(line: AnnotationLine): EffectiveAnnotationLine {
  const manualKana = line.manualOverrides.kana ?? undefined;
  const kana = manualKana ?? line.kana;

  return {
    original: line.original,
    reading: line.manualOverrides.reading ?? manualKana ?? line.reading,
    kana,
    romaji: line.manualOverrides.romaji ?? (manualKana ? kanaToRomaji(manualKana) : line.romaji),
    zhAssist: line.manualOverrides.zhAssist ?? (manualKana ? generateZhAssist(manualKana) : line.zhAssist),
    difficultyNotes: line.manualOverrides.notes?.length
      ? line.manualOverrides.notes
      : manualKana
        ? detectDifficultyNotes(manualKana)
        : line.difficultyNotes
  };
}
