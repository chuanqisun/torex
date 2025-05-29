# 🦖 Torex

**Typed Object Reflection**: Infer TypeScript interface from JSON

[Live demo](https://chuanqisun.github.io/tools/json-to-typescript/)

## Get started

Install

```bash
npm i torex
```

Examples

```typescript
import { getType } from "torex";

getType({
  myKey: "myValue",
})
/*
interface IRoot {
  myKey: string;
}
*/

getType({ myKey: "myValue" }, { rootName: "MyObject" });
/*
interface IMyObject {
  myKey: string;
}
*/

getType([{ name: "a" }, { name: "b", size: 42 }]);
/*
type Root = IRootItem[];

interface IRootItem {
  name: string;
  size?: number;
}
*/

getType([{ name: "a" }, { name: "b", size: 42 }], { scope: "root-item" });
/*
type Root = IRootItem[];

interface IRootItem {
  name: string;
  size?: number;
}
*/

getType([{ name: "a" }, { name: "b", size: 42 }], { rootName: "MyObject", scope: "root-item" }));
/*
interface IMyObject {
  name: string;
  size?: number;
}
*/
```
