import { describe, expect, it } from "vitest";
import { buildCliCommands, defaultCliCommandInputs, quotePowerShellArg } from "./commandBuilder";

describe("command builder", () => {
  it("builds the annotate command", () => {
    const commands = buildCliCommands(defaultCliCommandInputs());

    expect(commands[0]).toMatchObject({
      id: "annotate",
      enabled: true,
      command: "singbridge annotate lyrics.txt --language ja --out song.json"
    });
  });

  it("quotes PowerShell paths with spaces and single quotes", () => {
    expect(quotePowerShellArg("C:\\Songs\\my lyric.txt")).toBe("'C:\\Songs\\my lyric.txt'");
    expect(quotePowerShellArg("it'll work.txt")).toBe("'it''ll work.txt'");
  });

  it("disables reference commands when the reference path is empty", () => {
    const inputs = {
      ...defaultCliCommandInputs(),
      referencePath: ""
    };
    const commands = buildCliCommands(inputs);

    expect(commands.find((command) => command.id === "annotate")?.enabled).toBe(true);
    expect(commands.find((command) => command.id === "compare")?.enabled).toBe(false);
    expect(commands.find((command) => command.id === "draft")?.enabled).toBe(false);
    expect(commands.find((command) => command.id === "apply")?.enabled).toBe(false);
  });
});
