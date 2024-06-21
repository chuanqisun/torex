import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fragments, getSample, sample, strategy, stringifySample } from "../sample";

describe("sample", () => {
  it("sample empty array", () => {
    const result = sample([]);
    assert.deepEqual([...result], []);
  });

  it("sample single value", () => {
    const result = sample([1]);
    assert.deepEqual([...result], [1]);
  });

  it("sample two values", () => {
    const result = sample([1, 100]);
    assert.deepEqual([...result], [1, 100]);
  });

  it("three values", () => {
    const result = sample([1, 50, 100]);
    assert.deepEqual([...result], [1, 50, 100]);
  });

  it("four values", () => {
    const result = sample([1, 50, 75, 100]);
    assert.deepEqual([...result], [1, 100]);
    result[strategy] = "hide-middle";
    result[fragments] = [{ start: 1, length: 2 }];
  });

  it("long array", () => {
    const input = [...Array(10)].map((_, i) => i);
    const result = sample(input);
    assert.deepEqual([...result], [0, 9]);
  });

  it("array compression disabled", () => {
    const result = sample([1, 50, 100], { arrayCompression: "none" });
    assert.deepEqual([...result], [1, 50, 100]);
  });
});

describe("stringifySample", () => {
  it("primitive", () => {
    assert.equal(stringifySample(null), "null");
    assert.equal(stringifySample(0), "0");
    assert.equal(stringifySample("a"), '"a"');
    assert.equal(stringifySample(undefined), "undefined");
    assert.equal(stringifySample(true), "true");
  });

  it("empty array", () => {
    assert.equal(stringifySample([]), "[]");
  });

  it("empty object", () => {
    assert.equal(stringifySample({}), "{}");
  });

  it("array with primitive values", () => {
    assert.equal(stringifySample([null, 0, "a", undefined, true]), `[null, 0, "a", undefined, true]`);
  });

  it("object with primitive values", () => {
    assert.equal(stringifySample({ a: null, b: 0, c: "a", d: undefined, e: true }), `{ "a": null, "b": 0, "c": "a", "d": undefined, "e": true }`);
  });

  it("array with complex values", () => {
    assert.equal(
      stringifySample([{ a: 1 }, { b: 2 }]),
      `
[
  { "a": 1 },
  { "b": 2 }
]`.trim()
    );
  });

  it("multi-level nested object", () => {
    assert.equal(
      stringifySample({ a: { b: { c: 1 } } }),
      `
{
  "a": {
    "b": { "c": 1 }
  }
}
    
    `.trim()
    );
  });

  it("multi-level nested array", () => {
    assert.equal(
      stringifySample([[[1, 2, 3]]]),
      `
[
  [
    [1, 2, 3]
  ]
]
      `.trim()
    );
  });
});

describe("getSample", () => {
  it("empty object", () => {
    const result = getSample({});
    assert.equal(result, "{}");
  });

  it("empty array", () => {
    const result = getSample([]);
    assert.equal(result, "[]");
  });

  it("two element array", () => {
    const result = getSample([1, 2]);
    assert.equal(result, `[1, 2]`.trim());
  });

  it("do not skip 1 item", () => {
    const result = getSample([1, 2, 3]);
    assert.equal(result, `[1, 2, 3]`.trim());
  });

  it("long primitive array", () => {
    const result = getSample([...Array(10)].map((_, i) => i));
    assert.equal(result, `[0, ...(8 items), 9]`.trim());
  });

  it("long blocks array", () => {
    const result = getSample([...Array(10)].map((_, i) => ({ a: i })));
    assert.equal(
      result,
      `
[
  { "a": 0 },
  ...(8 items),
  { "a": 9 }
] 
      `.trim()
    );
  });
});
