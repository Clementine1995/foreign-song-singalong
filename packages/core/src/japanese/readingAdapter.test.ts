import { describe, expect, it } from "vitest";
import { generateKanaReading } from "./readingAdapter.js";

describe("generateKanaReading", () => {
  it("generates kana from local dictionary readings", async () => {
    await expect(generateKanaReading("どうでもいいような夜だけど")).resolves.toEqual({
      kana: "どうでもいいようなよるだけど",
      romaji: "dou demo ii you na yoru dakedo",
      reviewReasons: ["unknown_kanji_reading"]
    });
  });

  it("normalizes compatibility and simplified characters before tokenizing", async () => {
    const result = await generateKanaReading("まだ止まった刻む针も");

    expect(result.kana).toBe("まだとまったきざむはりも");
    expect(result.romaji).toBe("mada tomatta kizamu hari mo");
    expect(result.reviewReasons).toContain("unknown_kanji_reading");
  });

  it("uses local lyric reading overrides for known special readings", async () => {
    const result = await generateKanaReading("響めき 煌めきと君も (Oh)");

    expect(result.kana).toBe("どよめききらめきときみも(Oh)");
    expect(result.romaji).toBe("doyomeki kirameki to kimi mo (Oh)");
    expect(result.reviewReasons).toContain("unknown_kanji_reading");
  });

  it("uses Dragon Ball sample lyric readings from reference romaji", async () => {
    await expect(generateKanaReading("DAN DAN 心魅かれてく")).resolves.toMatchObject({
      kana: "DANDANこころひかれてく",
      romaji: "DAN DAN kokoro hikareteku"
    });
    await expect(generateKanaReading("果てない暗闇から飛び出そう")).resolves.toMatchObject({
      kana: "はてないやみからとびだそう",
      romaji: "hatenai yami kara tobidasou"
    });
    await expect(generateKanaReading("子供のころ大切に想ってた景色を思い出したんだ")).resolves.toMatchObject({
      kana: "こどものころたいせつにおもっていたばしょをおもいだしたんだ",
      romaji: "kodomo no koro taisetsu ni omotte ita basho wo omoidashita n'da"
    });
  });
});
