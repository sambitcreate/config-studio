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
});
