import { describe, expect, it } from "vitest";
import { computeDiff } from "./index";

describe("computeDiff", () => {
  it("marks unchanged, removed, and added lines", () => {
    expect(computeDiff("a\nb\nc", "a\nx\nc\nd")).toEqual([
      "  a",
      "- b",
      "+ x",
      "  c",
      "+ d",
    ]);
  });
});
