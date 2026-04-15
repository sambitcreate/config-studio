import { describe, expect, it } from "vitest";
import { validateAgainstSchema, validateBasicJson } from "./index";

describe("validation helpers", () => {
  it("validates data against a JSON schema", () => {
    const schema = {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
      },
    };

    expect(validateAgainstSchema({ name: "OpenCode" }, schema)).toEqual({
      valid: true,
      errors: [],
    });

    expect(validateAgainstSchema({}, schema)).toEqual({
      valid: false,
      errors: [{ path: "/", message: "must have required property 'name'" }],
    });
  });

  it("reports malformed JSON content", () => {
    expect(validateBasicJson('{"name":"OpenCode"}')).toEqual({
      valid: true,
      errors: [],
    });

    expect(validateBasicJson('{"name":')).toMatchObject({
      valid: false,
      errors: [{ path: "/" }],
    });
  });

  it("rejects an empty string as invalid JSON", () => {
    const result = validateBasicJson("");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validates deeply nested valid data against a schema", () => {
    const schema = {
      type: "object",
      properties: {
        level1: {
          type: "object",
          properties: {
            level2: { type: "string" },
          },
        },
      },
    };

    expect(
      validateAgainstSchema({ level1: { level2: "deep" } }, schema)
    ).toEqual({ valid: true, errors: [] });
  });

  it("accepts valid JSON arrays", () => {
    expect(validateBasicJson("[1,2,3]")).toEqual({
      valid: true,
      errors: [],
    });
  });
});
