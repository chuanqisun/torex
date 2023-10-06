import assert from "node:assert";
import { describe, it } from "node:test";
import { getType, type Options } from "..";

function assertReflection(input: any, options: Options, output: string) {
  assert.strictEqual(getType(input, options), output.trim());
}

describe("e2e", () => {
  it("Simple object", () => {
    assertReflection(
      { myKey: "myValue" },
      {},
      `
interface IRoot {
  myKey: string;
}`
    );
  });

  it("Customize root type name", () => {
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

  it("Simple array", () => {
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

  it("Customize array item type name", () => {
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
