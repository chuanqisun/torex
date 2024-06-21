import assert from "assert/strict";
import { describe, it } from "node:test";
import { complexity } from "../utils/complexity";

describe("complexity", () => {
  it("primitives have low complexity", () => {
    assert(complexity(null) < 5, "null is simple");
    assert(complexity(true) < 5, "boolean is simple");
    assert(complexity("a") < 5, "string is simple");
    assert(complexity(1) < 5, "number is simple");
  });

  it("string scales with length", () => {
    assert(complexity("a") < complexity("aaa"), "complexity increases with length");
  });

  it("array scales with length", () => {
    assert(complexity([]) < complexity([1]), "complexity increases with length");
    assert(complexity([1]) < complexity([1, 2, 3]), "complexity increases with length");
  });

  it("object scales with length", () => {
    assert(complexity({}) < complexity({ a: 1 }), "complexity increases with length");
    assert(complexity({ a: 1 }) < complexity({ a: 1, b: 2, c: 3 }), "complexity increases with length");
  });

  it("object more complex than array", () => {
    assert(complexity({ a: 1 }) > complexity([1]), "object is more complex than array");
  });
});
