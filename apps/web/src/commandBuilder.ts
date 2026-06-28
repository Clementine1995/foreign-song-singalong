export interface CliCommandInputs {
  lyricsPath: string;
  projectPath: string;
  referencePath: string;
  reportPath: string;
  correctionsPath: string;
  correctedPath: string;
}

export interface CliCommand {
  id: "annotate" | "compare" | "draft" | "apply";
  title: string;
  description: string;
  command: string;
  enabled: boolean;
}

export function defaultCliCommandInputs(): CliCommandInputs {
  return {
    lyricsPath: "lyrics.txt",
    projectPath: "song.json",
    referencePath: "reference-romaji.txt",
    reportPath: "romaji-report.md",
    correctionsPath: "corrections.json",
    correctedPath: "corrected.json"
  };
}

export function buildCliCommands(inputs: CliCommandInputs): CliCommand[] {
  const hasLyrics = inputs.lyricsPath.trim().length > 0;
  const hasProject = inputs.projectPath.trim().length > 0;
  const hasReference = inputs.referencePath.trim().length > 0;

  return [
    {
      id: "annotate",
      title: "生成标注 JSON",
      description: "把歌词文本转换成 WebUI 可加载的 song.json。",
      command: [
        "singbridge annotate",
        quotePowerShellArg(inputs.lyricsPath),
        "--language ja",
        "--out",
        quotePowerShellArg(inputs.projectPath)
      ].join(" "),
      enabled: hasLyrics && hasProject
    },
    {
      id: "compare",
      title: "生成 romaji 对照报告",
      description: "把当前生成结果和参考 romaji 逐行对照，输出 Markdown 报告。",
      command: [
        "singbridge compare-romaji",
        quotePowerShellArg(inputs.lyricsPath),
        "--reference",
        quotePowerShellArg(inputs.referencePath),
        "--out",
        quotePowerShellArg(inputs.reportPath)
      ].join(" "),
      enabled: hasLyrics && hasReference && inputs.reportPath.trim().length > 0
    },
    {
      id: "draft",
      title: "生成修正建议 JSON",
      description: "根据参考 romaji 生成 corrections.json，用于 WebUI overlay。",
      command: [
        "singbridge draft-romaji-corrections",
        quotePowerShellArg(inputs.projectPath),
        "--reference",
        quotePowerShellArg(inputs.referencePath),
        "--out",
        quotePowerShellArg(inputs.correctionsPath)
      ].join(" "),
      enabled: hasProject && hasReference && inputs.correctionsPath.trim().length > 0
    },
    {
      id: "apply",
      title: "应用参考 romaji",
      description: "把参考 romaji 写入 manualOverrides.romaji，输出 corrected.json。",
      command: [
        "singbridge apply-romaji-reference",
        quotePowerShellArg(inputs.projectPath),
        "--reference",
        quotePowerShellArg(inputs.referencePath),
        "--out",
        quotePowerShellArg(inputs.correctedPath)
      ].join(" "),
      enabled: hasProject && hasReference && inputs.correctedPath.trim().length > 0
    }
  ];
}

export function quotePowerShellArg(value: string): string {
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_./\\:-]+$/.test(trimmed)) {
    return trimmed;
  }

  return `'${trimmed.replace(/'/g, "''")}'`;
}
