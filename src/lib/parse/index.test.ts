import { describe, expect, it } from "vitest";
import {
  detectFormat,
  getFileName,
  parseContent,
  parseJson,
  serializeJson,
  stripJsoncComments,
  supportsStructuredEditing,
  supportsVisualEditing,
} from "./index";

describe("parse helpers", () => {
  it("detects supported file formats case-insensitively", () => {
    expect(detectFormat("/tmp/app.JSON")).toBe("json");
    expect(detectFormat("/tmp/app.jsonc")).toBe("jsonc");
    expect(detectFormat("/tmp/app.YML")).toBe("yaml");
    expect(detectFormat("/tmp/app.toml")).toBe("toml");
    expect(detectFormat("/tmp/app.conf")).toBe("json");
  });

  it("reports which formats support structured and visual editing", () => {
    expect(supportsStructuredEditing("json")).toBe(true);
    expect(supportsStructuredEditing("jsonc")).toBe(true);
    expect(supportsStructuredEditing("yaml")).toBe(false);
    expect(supportsVisualEditing("json")).toBe(true);
    expect(supportsVisualEditing("jsonc")).toBe(false);
  });

  it("parses object roots and wraps array roots", () => {
    expect(parseJson('{"name":"OpenCode"}')).toEqual({
      data: { name: "OpenCode" },
      error: null,
    });

    expect(parseJson("[1,2,3]")).toEqual({
      data: { _root: [1, 2, 3] },
      error: null,
    });
  });

  it("rejects primitive roots and malformed JSON", () => {
    expect(parseJson("true")).toEqual({
      data: null,
      error: "Root value is not an object or array",
    });

    expect(parseJson('{"name":')).toMatchObject({
      data: null,
    });
  });

  it("strips JSONC comments without touching string content", () => {
    const content = [
      "{",
      "  // keep the url below",
      '  "url": "https://example.com/api",',
      '  "quoted": "She said \\\"// not a comment\\\"",',
      "  /* block comment */",
      '  "enabled": true',
      "}",
    ].join("\n");

    expect(stripJsoncComments(content)).toBe([
      "{",
      "  ",
      '  "url": "https://example.com/api",',
      '  "quoted": "She said \\\"// not a comment\\\"",',
      "  ",
      '  "enabled": true',
      "}",
    ].join("\n"));
  });

  it("parses JSONC content after removing comments", () => {
    expect(
      parseContent(
        [
          "{",
          "  // comment",
          '  "url": "https://example.com"',
          "}",
        ].join("\n"),
        "jsonc"
      )
    ).toEqual({
      data: { url: "https://example.com" },
      error: null,
    });
  });

  it("returns raw-mode guidance for unsupported structured formats", () => {
    expect(parseContent("name: value", "yaml")).toEqual({
      data: null,
      error: "YAML structured editing is not available yet. Raw mode is still available.",
    });

    expect(parseContent("key = 'value'", "toml")).toEqual({
      data: null,
      error: "TOML structured editing is not available yet. Raw mode is still available.",
    });
  });

  it("serializes config data with stable indentation", () => {
    expect(serializeJson({ name: "OpenCode" })).toBe([
      "{",
      '  "name": "OpenCode"',
      "}",
    ].join("\n"));
  });

  it("extracts file names from paths", () => {
    expect(getFileName("/tmp/config.json")).toBe("config.json");
    expect(getFileName("config.json")).toBe("config.json");
  });
});
