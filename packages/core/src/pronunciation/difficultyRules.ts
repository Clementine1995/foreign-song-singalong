import type { DifficultyNote, DifficultyType } from "../schema/annotation.js";
import { toHiragana } from "../japanese/kana.js";

interface Rule {
  type: DifficultyType;
  pattern: RegExp;
  message: (span: string) => string;
  confidence: DifficultyNote["confidence"];
}

const rules: Rule[] = [
  {
    type: "sokuon",
    pattern: /っ/g,
    message: () => "小「っ」表示短暂停顿，像卡住半拍再进入后面的音。",
    confidence: "high"
  },
  {
    type: "long_vowel",
    pattern: /[おこそとのほもよろごぞどぼぽょ]う|[えけせてねへめれげぜでべぺ]い|([あいうえお])\1|ー/g,
    message: (span) => `「${span}」通常要唱得更连、更长，不要一带而过。`,
    confidence: "medium"
  },
  {
    type: "youon",
    pattern: /[きぎしじちにひびぴみり][ゃゅょ]/g,
    message: (span) => `「${span}」是拗音，要合成一个音节唱，不要拆得太开。`,
    confidence: "high"
  },
  {
    type: "nasal_n",
    pattern: /ん/g,
    message: () => "「ん」是拨音，跟后面的音连在一起时鼻音位置会变化。",
    confidence: "medium"
  },
  {
    type: "tsu",
    pattern: /つ/g,
    message: () => "「つ」接近 tsu，不要直接读成中文拼音 ci。",
    confidence: "high"
  },
  {
    type: "fu",
    pattern: /ふ/g,
    message: () => "「ふ」嘴唇放松送气，和中文的 fu 不完全一样。",
    confidence: "high"
  },
  {
    type: "shi_chi_ji",
    pattern: /し|ち|じ/g,
    message: (span) => `「${span}」容易被中文习惯带偏，先按 romaji 轻读再贴旋律。`,
    confidence: "medium"
  },
  {
    type: "ra_row",
    pattern: /ら|り|る|れ|ろ/g,
    message: (span) => `「${span}」在 l/r 之间轻触，不要读成很重的中文 r。`,
    confidence: "medium"
  },
  {
    type: "voiced_sound",
    pattern: /[がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ]/g,
    message: (span) => `「${span}」注意浊音或半浊音的入口，别唱成清音。`,
    confidence: "medium"
  }
];

export function detectDifficultyNotes(input: string): DifficultyNote[] {
  const kana = toHiragana(input);
  const notes: DifficultyNote[] = [];

  for (const rule of rules) {
    for (const match of kana.matchAll(rule.pattern)) {
      const span = match[0];
      const start = match.index ?? 0;
      notes.push({
        type: rule.type,
        span,
        start,
        end: start + span.length,
        message: rule.message(span),
        confidence: rule.confidence
      });
    }
  }

  return dedupeNotes(notes).sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
}

function dedupeNotes(notes: DifficultyNote[]): DifficultyNote[] {
  const seen = new Set<string>();
  const result: DifficultyNote[] = [];

  for (const note of notes) {
    const key = `${note.type}:${note.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(note);
  }

  return result;
}
