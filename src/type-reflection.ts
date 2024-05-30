import { emit } from "./emit";
import { parse } from "./parse";

export interface TypeOptions {
  rootName?: string;
  scope?: "root" | "root-item";
}

export function getType(input: any, options?: TypeOptions): string {
  if (options?.scope === "root-item") {
    if (!Array.isArray(input)) throw new Error("Input is not an array");
    return getItemType(input, { typeName: options?.rootName ?? "Item", interfacePrefix: "I" });
  }

  const root = parse(input);
  const code = emit(root, { rootName: options?.rootName ?? "Root", interfacePrefix: "I" });
  return code;
}

interface ItemOptions {
  typeName: string;
  interfacePrefix: string;
}
function getItemType(input: any[], options: ItemOptions): string {
  // HACK, when array is empty, use an empty object to simulate arbitrary item
  const root = parse(input.length ? input : [{}]);
  const itemRoot = root.children?.get(0);
  if (!itemRoot) throw new Error("Parser error: Did not find array item");
  const code = emit(itemRoot, { rootName: options.typeName, interfacePrefix: options.interfacePrefix });
  return code;
}
