import assert from "node:assert";
import { describe, it } from "node:test";
import { getType, type TypeOptions } from "..";

function assertReflection(input: any, options: TypeOptions, output: string) {
  assert.strictEqual(getType(input, options), output.trim());
}

describe("e2e", () => {
  it("Object", () => {
    assertReflection(
      { myKey: "myValue" },
      {},
      `
interface IRoot {
  myKey: string;
}`
    );
  });

  it("Customize object root name", () => {
    assertReflection(
      { myKey: "myValue" },
      { rootName: "MyObject" },
      `
interface IMyObject {
  myKey: string;
}
`
    );
  });

  it("Array", () => {
    assertReflection(
      [{ name: "a" }, { name: "b", size: 42 }],
      {},
      `
type Root = IRootItem[];

interface IRootItem {
  name: string;
  size?: number;
}
`
    );
  });

  it("Array item", () => {
    assertReflection(
      [{ name: "a" }, { name: "b", size: 42 }],
      { scope: "root-item" },
      `
interface IItem {
  name: string;
  size?: number;
}
`
    );
  });

  it("Customize array item root name", () => {
    assertReflection(
      [{ name: "a" }, { name: "b", size: 42 }],
      { rootName: "MyItem", scope: "root-item" },
      `
interface IMyItem {
  name: string;
  size?: number;
}`
    );
  });
});
