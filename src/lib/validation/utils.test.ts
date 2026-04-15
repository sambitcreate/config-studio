import { describe, expect, it } from "vitest";
import {
  createValidationError,
  formatValidationPath,
  getTopLevelValidationSection,
  getValidationMarkerRange,
  mapJsonFormsErrors,
  toJsonFormsPath,
} from "./utils";

describe("validation utils", () => {
  it("formats JSON pointer paths for display and form targeting", () => {
    expect(formatValidationPath("/provider/google/models/0/name")).toBe("provider.google.models[0].name");
    expect(formatValidationPath("/")).toBe("Root");
    expect(getTopLevelValidationSection("/provider/google/models/0/name")).toBe("provider");
    expect(toJsonFormsPath("/provider/google/models/0/name")).toBe("provider.google.models.0.name");
  });

  it("maps JSON Forms errors into app validation errors", () => {
    expect(
      mapJsonFormsErrors([{ instancePath: "/provider", message: "must be string" }])
    ).toEqual([
      {
        path: "/provider",
        message: "must be string",
        severity: "error",
      },
    ]);
  });

  it("extracts raw editor locations from parse messages and JSON paths", () => {
    const parseError = createValidationError("/", "Unexpected token } in JSON at position 20", "error", [
      "{",
      '  "name": "demo",',
      "}",
    ].join("\n"));

    expect(parseError.line).toBeDefined();
    expect(parseError.column).toBeDefined();

    const schemaRange = getValidationMarkerRange(
      ['{', '  "provider": {', '    "name": "demo"', "  }", "}"].join("\n"),
      {
        path: "/provider/name",
        message: "must be number",
        severity: "error",
      }
    );

    expect(schemaRange.startLineNumber).toBe(3);
    expect(schemaRange.startColumn).toBeGreaterThan(1);
  });

  it("returns an empty array when mapping undefined or empty errors", () => {
    expect(mapJsonFormsErrors(undefined)).toEqual([]);
    expect(mapJsonFormsErrors([])).toEqual([]);
  });

  it("filters _root segments from formatted paths", () => {
    expect(formatValidationPath("/_root/0/name")).toBe("[0].name");
  });

  it("returns null top-level section for numeric-only paths", () => {
    expect(getTopLevelValidationSection("/0")).toBeNull();
    expect(getTopLevelValidationSection("/")).toBeNull();
  });
});
