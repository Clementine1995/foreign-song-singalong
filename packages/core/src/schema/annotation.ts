export type LanguageCode = "ja";

export interface SourceInfo {
  type: "user_paste" | "file_import";
  note?: string;
  inputFile?: string;
}

export interface AnnotationSettings {
  pronunciationMode: "zh_assist";
  romajiStyle: "singing_friendly";
}

export type DifficultyType =
  | "long_vowel"
  | "sokuon"
  | "youon"
  | "nasal_n"
  | "tsu"
  | "fu"
  | "shi_chi_ji"
  | "ra_row"
  | "voiced_sound"
  | "rhythm_hint";

export interface DifficultyNote {
  type: DifficultyType;
  span: string;
  start?: number;
  end?: number;
  message: string;
  confidence: "high" | "medium" | "low";
}

export interface ManualOverrides {
  reading?: string | null;
  kana?: string | null;
  romaji?: string | null;
  zhAssist?: string | null;
  notes?: DifficultyNote[];
}

export type ReviewReason =
  | "unknown_kanji_reading"
  | "mixed_language_line"
  | "reading_adapter_unavailable"
  | "non_japanese_line";

export interface AnnotationLine {
  id: string;
  index: number;
  timestamp?: string;
  original: string;
  reading?: string;
  kana?: string;
  romaji?: string;
  zhAssist?: string;
  difficultyNotes: DifficultyNote[];
  needsReview: boolean;
  reviewReasons: ReviewReason[];
  manualOverrides: ManualOverrides;
}

export interface AnnotationProject {
  version: 1;
  title?: string;
  artist?: string;
  language: LanguageCode;
  source: SourceInfo;
  settings: AnnotationSettings;
  lines: AnnotationLine[];
}
