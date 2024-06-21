/**
 * Helper function to determine how "readable" an object is for AI
 * High complexity object may lead to token explosion and should be compressed to samples or types to reduce complexity
 * Recursive objects are not supported
 * @returns @type {number} the complexity of the object
 */
export function complexity(obj: any): number {
  // string is len + 2
  if (typeof obj === "string") {
    return obj.length + 2;
  }

  // primitive is 1
  if (obj === null || typeof obj !== "object") {
    return 1;
  }

  // array is 1 + number of elements + sum of its elements
  // rationale: the comma separator is a token
  if (Array.isArray(obj)) {
    return 1 + obj.length + obj.reduce((acc, item) => acc + complexity(item), 0);
  }

  // object is 1 + 2 * number of keys + sum of its keys and values
  // ration: the colon and comma each adds a point
  if (typeof obj === "object") {
    return 1 + 2 * Object.keys(obj).length + Object.values(obj as Record<any, any>).reduce((acc, item) => acc + complexity(item), 0);
  }

  return 1; // catch all
}
