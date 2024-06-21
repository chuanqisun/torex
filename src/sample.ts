/**
 * A utility function for sampling data
 *
 * Walk the entire json tree and output a reduced json object by sampling the input
 * long strings will be cropped
 */
export interface SampleOptions {
  /**
   * @default 48
   */
  maxTextLength?: number;
  /**
   * How should long array be sampled
   * - "hide-middle": sample head and tail, and skip anything in between
   * - "none": sample all
   * @default "hide-middle"
   */
  arrayCompression?: "hide-middle" | "none";
}

export const strategy = Symbol("strategy");
export const fragments = Symbol("fragments");

export interface ArrayFragment {
  pos: number;
  skip?: number;
  value?: any;
}

export function getSample(input: any, options?: SampleOptions): string {
  const sampled = sample(input, options);
  return stringifySample(sampled);
}

export function sample(object: any, options?: SampleOptions): any {
  const { maxTextLength = 48, arrayCompression = "hide-middle" } = { ...options };

  const type = typeof object;
  switch (type) {
    case "object":
      if (object === null) {
        return null;
      } else if (Array.isArray(object)) {
        // sample head, middle, tail
        if (!object.length) return [];

        if (arrayCompression === "hide-middle") {
          const uniqueSamples = skipMiddle(object);
          const values = uniqueSamples.map((item) => sample(item, options));
          (values as any)[strategy] = (uniqueSamples as any)[strategy];
          (values as any)[fragments] = (uniqueSamples as any)[fragments];
          return values;
        } else {
          return object.map((item) => sample(item, options));
        }
      } else {
        return Object.fromEntries(
          Object.entries(object).map(([key, value]) => {
            return [key, sample(value)];
          })
        );
      }
    case "string":
      return trimTextIfOverflow(maxTextLength)(object); // for reference: uuid is 36 char long
    default:
      return object;
  }
}

function trimTextIfOverflow(length: number) {
  return (text: string) => {
    if (text.length > length) {
      return text.slice(0, length) + "...";
    } else {
      return text;
    }
  };
}

function skipMiddle<T extends any>(arr: T[]): T[] {
  const result = [] as any[];
  (result as any)[strategy] = "hide-middle";
  (result as any)[fragments] = [];

  if (!arr.length) return result;

  const sampledIndices = arr.length === 1 ? [0] : arr.length === 2 ? [0, 1] : arr.length === 3 ? [0, 1, 2] : [0, arr.length - 1]; // do not skip the only middle item
  const uniqueSampleIndices = [...new Set(sampledIndices)];
  const samples = uniqueSampleIndices.map((index) => arr.at(index)).filter((item) => item !== undefined) as T[];

  const inclusiveRanges = pairs(sampledIndices);
  const showRanges: ArrayFragment[] = uniqueSampleIndices.map((index) => ({ pos: index, value: arr.at(index) } satisfies ArrayFragment));
  const hiddenRanges: ArrayFragment[] = inclusiveRanges
    .map(([start, end]) => ({ pos: start + 1, skip: end - start - 1 } satisfies ArrayFragment))
    .filter(({ skip: length }) => length > 0);

  (result as any)[fragments] = [...showRanges, ...hiddenRanges].sort((a, b) => a.pos - b.pos);
  result.push(...samples);

  return result;
}

function pairs<T>(arr: T[]): [T, T][] {
  return arr.reduce((acc, item, index) => {
    if (index % 2 === 0) {
      acc.push([item, arr[index + 1]]);
    }
    return acc;
  }, [] as [T, T][]);
}

export function stringifySample(value: any): string {
  const result = stringifySampleInternal({ lineIndent: 2 }, value);
  return result.toString();
}

class PrimitiveString extends String {}

interface StringifyOptions {
  lineIndent: number;
}
function stringifySampleInternal(options: StringifyOptions, value: any): String {
  const { lineIndent = 2 } = options ?? {};

  // primitives, null, undefined should be the same as JSON.stringify
  if (value === null || typeof value !== "object") {
    const primitiveStr = new PrimitiveString(JSON.stringify(value));
    return primitiveStr;
  }

  if (Array.isArray(value)) {
    let items: String[] = [];

    if ((value as any)[fragments]) {
      items = ((value as any)[fragments] as ArrayFragment[]).map((frag) =>
        frag.skip
          ? new PrimitiveString(`...(${frag.skip} ${frag.skip > 1 ? "items" : "item"})`)
          : stringifySampleInternal({ lineIndent: lineIndent + 2 }, frag.value)
      );
    } else {
      items = value.map((item) => stringifySampleInternal({ lineIndent: lineIndent + 2 }, item));
    }

    if (items.every(isPrimitiveStr)) {
      return `[${items.join(", ")}]`;
    } else {
      const entries = items.map((item) => `${" ".repeat(lineIndent)}${item}`);

      return `[
${entries.join(",\n")}
${" ".repeat(lineIndent - 2)}]`;
    }
  } else {
    const entries = Object.entries(value).map(([key, value]) => [key, stringifySampleInternal({ lineIndent: lineIndent + 2 }, value)]);

    if (entries.every(([, value]) => isPrimitiveStr(value))) {
      return entries.length ? `{ ${entries.map(([key, value]) => `"${key}": ${value}`).join(", ")} }` : "{}";
    } else {
      const entries = Object.entries(value).map(([key, value]) => {
        return `${" ".repeat(lineIndent)}"${key}": ${stringifySampleInternal({ lineIndent: lineIndent + 2 }, value)}`;
      });

      return `{
${entries.join(",\n")}
${" ".repeat(lineIndent - 2)}}`;
    }
  }
}
function isPrimitiveStr(value: String): boolean {
  return value instanceof PrimitiveString;
}
