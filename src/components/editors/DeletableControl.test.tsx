import { describe, expect, it } from "vitest";
import {
  deletableControlTester,
  deletableControlRenderer,
} from "./DeletableControl";

function makeControl(
  propName: string,
  propType: string,
) {
  return {
    type: "Control",
    scope: `#/properties/${propName}`,
  };
}

function makeSchema(propName: string, propType: string) {
  return {
    type: "object",
    properties: { [propName]: { type: propType } },
  } as any;
}

describe("deletableControlTester", () => {
  it("ranks string controls above 0", () => {
    const rank = deletableControlTester(
      makeControl("name", "string"),
      makeSchema("name", "string"),
    );
    expect(rank).toBeGreaterThan(0);
  });

  it("ranks number controls above 0", () => {
    const rank = deletableControlTester(
      makeControl("age", "number"),
      makeSchema("age", "number"),
    );
    expect(rank).toBeGreaterThan(0);
  });

  it("ranks integer controls above 0", () => {
    const rank = deletableControlTester(
      makeControl("count", "integer"),
      makeSchema("count", "integer"),
    );
    expect(rank).toBeGreaterThan(0);
  });

  it("ranks boolean controls above 0", () => {
    const rank = deletableControlTester(
      makeControl("active", "boolean"),
      makeSchema("active", "boolean"),
    );
    expect(rank).toBeGreaterThan(0);
  });
});

describe("deletableControlRenderer", () => {
  it("exposes the tester and renderer", () => {
    expect(deletableControlRenderer).toHaveProperty("tester", deletableControlTester);
    expect(deletableControlRenderer).toHaveProperty("renderer");
    expect(typeof deletableControlRenderer.renderer).toBe("function");
  });
});
