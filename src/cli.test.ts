import { describe, it, expect, vi } from "vitest";
import { Command, program } from "commander";
import { main } from "./cli";
import { prompt } from "./commands/prompt";

vi.mock("./commands/prompt");

describe("cli", () => {
  it("should add the prompt command to the program as the default one", async () => {
    const mockPromptCommand = {} as Command;
    vi.mocked(prompt).mockReturnValue(mockPromptCommand);
    vi.spyOn(program, "addCommand").mockImplementation(() => program);
    vi.spyOn(program, "parseAsync").mockResolvedValue(undefined as never);

    await main();

    expect(program.addCommand).toHaveBeenCalledWith(mockPromptCommand, {
      isDefault: true,
    });
  });

  it("should call parseAsync on the program", async () => {
    vi.spyOn(program, "addCommand").mockImplementation(() => program);
    vi.spyOn(program, "parseAsync").mockResolvedValue(undefined as never);

    await main();

    expect(program.parseAsync).toHaveBeenCalled();
  });
});
