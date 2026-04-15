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

  it("returns a single unchanged entry for two empty strings", () => {
    expect(computeDiff("", "")).toEqual(["  "]);
  });

  it("marks all lines as unchanged when strings are identical", () => {
    expect(computeDiff("a\nb\nc", "a\nb\nc")).toEqual(["  a", "  b", "  c"]);
  });

  it("treats new lines as additions when the original is shorter", () => {
    expect(computeDiff("a", "a\nb")).toEqual(["  a", "+ b"]);
  });
});
