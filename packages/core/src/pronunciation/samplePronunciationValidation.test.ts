import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createAnnotationProjectWithReading } from "../annotation/createAnnotation.js";
import { parseLyrics } from "../input/parseLyrics.js";
import { toMarkdown } from "../export/toMarkdown.js";

const sampleBase = new URL("../../../../samples/pronunciation-validation/cases/", import.meta.url);

describe("pronunciation validation samples", () => {
  it("keeps particle wa and notes difficult sounds in 世界が終るまでは", async () => {
    const line = await annotateCase("sekai-particle-wa");

    expect(line).toMatchObject({
      kana: "せかいがおわるまでは",
      romaji: "sekai ga owaru made wa",
      zhAssist: "se ka i ga o wa lu/ru ma de ha"
    });
    expect(noteTypes(line)).toEqual(["voiced_sound", "ra_row", "voiced_sound"]);
  });

  it("uses the title reading override and ra-row notes in DAN DAN 心魅かれてく", async () => {
    const line = await annotateCase("dan-dan-ra-row");

    expect(line).toMatchObject({
      kana: "DANDANこころひかれてく",
      romaji: "DAN DAN kokoro hikareteku"
    });
    expect(line.zhAssist).toContain("ko ko lo/ro");
    expect(noteTypes(line)).toEqual(["ra_row", "ra_row"]);
  });

  it("surfaces long vowel and sokuon guidance in 僕が死のうと思ったのは", async () => {
    const line = await annotateCase("boku-sokuon-long-vowel");

    expect(line).toMatchObject({
      kana: "ぼくがしのうとおもったのは",
      romaji: "boku ga shinou to omotta no wa"
    });
    expect(line.zhAssist).toContain("shi no-o");
    expect(line.zhAssist).toContain("t-ta");
    expect(noteTypes(line)).toEqual(["voiced_sound", "voiced_sound", "shi_chi_ji", "long_vowel", "sokuon"]);
  });

  it("exports pronunciation validation samples to readable markdown", async () => {
    const lyrics = [
      readCase("sekai-particle-wa"),
      readCase("dan-dan-ra-row"),
      readCase("boku-sokuon-long-vowel")
    ].join("\n");
    const project = await createAnnotationProjectWithReading(parseLyrics(lyrics).lines);
    const markdown = toMarkdown(project);

    expect(markdown).toContain("Romaji：sekai ga owaru made wa");
    expect(markdown).toContain("Romaji：DAN DAN kokoro hikareteku");
    expect(markdown).toContain("中文发音辅助：bo ku ga shi no-o to-o mo t-ta no ha");
  });
});

async function annotateCase(name: string) {
  const project = await createAnnotationProjectWithReading(parseLyrics(readCase(name)).lines);
  return project.lines[0];
}

function readCase(name: string): string {
  return readFileSync(new URL(`${name}/lyrics.txt`, sampleBase), "utf8").trim();
}

function noteTypes(line: Awaited<ReturnType<typeof annotateCase>>): string[] {
  return line.difficultyNotes.map((note) => note.type);
}
