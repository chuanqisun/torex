# 🦖 Torex

**Typed Object Reflection**: Infer TypeScript interface from JSON

## Get started

Install

```bash
npm i torex
```

Use

```typescript
import { getType } from "torex";

/* Object */
console.log(
  getType({
    myKey: "myValue",
  })
);
/* Output:
interface IRoot {
  myKey: string;
}
*/

/* Customize object root name */
console.log(getType({ myKey: "myValue" }, { rootName: "MyObject" }));
/* Output:
interface IMyObject {
  myKey: string;
}
*/

/* Array */
console.log(getType([{ name: "a" }, { name: "b", size: 42 }]));
/* Output
type Root = IRootItem[];

interface IRootItem {
  name: string;
  size?: number;
}
*/

/* Array item */
console.log(getType([{ name: "a" }, { name: "b", size: 42 }], { scope: "root-item" }));
/* Output
type Root = IRootItem[];

interface IRootItem {
  name: string;
  size?: number;
}
*/

/* Customize array item root name */
console.log(getType([{ name: "a" }, { name: "b", size: 42 }], { rootName: "MyObject", scope: "root-item" }));
/* Output
interface IMyObject {
  name: string;
  size?: number;
}
*/
```

## Limitations

Only support TypeScript bundlers (e.g. vite, esbuild). Vanilla js is not distributed in the package
