import assert from "node:assert";
import { emit } from "../emit";
import { parse } from "../parse";

assertEmitter(1, `type Root = number;`);
assertEmitter({}, `type Root = any;`);
assertEmitter([], `type Root = any[];`);
assertEmitter([1], `type Root = number[];`);
assertEmitter([1, true, "string"], `type Root = (number | boolean | string)[];`);

assertEmitter(
  { a: 1 },
  `
interface IRoot {
  a: number;
}`
);

assertEmitter(
  { a: { x: 1 } },
  `
interface IRoot {
  a: IRootA;
}

interface IRootA {
  x: number;
}
`
);
assertEmitter(
  [{ a: [{}, {}, {}] }],
  `
type Root = IRootItem[];

interface IRootItem {
  a: any[];
}
`
);
assertEmitter([[], [], []], `type Root = any[][];`);
assertEmitter(
  [{ a: 1 }, {}, {}],
  `
type Root = IRootItem[];

interface IRootItem {
  a?: number;
}`
);

assertEmitter(
  { "": 1, " ": 1, " test ": 1, "a b": 1, "\n": 1, '"': 1, "\\": 1, "'": 1 },
  String.raw`
interface IRoot {
  "": number;
  " ": number;
  " test ": number;
  "a b": number;
  "\n": number;
  "\"": number;
  "\\": number;
  "'": number;
}
`
);

assertEmitter(
  { "": { a: 1 } },
  `
interface IRoot {
  "": IRootField;
}

interface IRootField {
  a: number;
}
`
);

assertEmitter(
  { "": { a: 1 }, " ": { a: 1 }, " test ": { a: 1 }, "a b": { a: 1 }, "\n": { a: 1 }, '"': { a: 1 }, "\\": { a: 1 }, "'": { a: 1 } },
  String.raw`
interface IRoot {
  "": IRootField;
  " ": IRootField2;
  " test ": IRootTest;
  "a b": IRootAB;
  "\n": IRootField3;
  "\"": IRootField4;
  "\\": IRootField5;
  "'": IRootField6;
}

interface IRootField {
  a: number;
}

interface IRootField2 {
  a: number;
}

interface IRootTest {
  a: number;
}

interface IRootAB {
  a: number;
}

interface IRootField3 {
  a: number;
}

interface IRootField4 {
  a: number;
}

interface IRootField5 {
  a: number;
}

interface IRootField6 {
  a: number;
}
`
);

function assertEmitter(input: any, expected: string) {
  const jsonTypeNode = parse(input);
  const declarations = emit(jsonTypeNode);

  try {
    assert.deepEqual(declarations.trim(), expected.trim());
  } catch (error) {
    console.error((error as any).name);
    console.log(`
=== Input ===
${JSON.stringify(input, null, 2)}

=== Expected ===
${expected.trim()}

=== Actual ===
${declarations}`);
  }
}
