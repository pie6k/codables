import { JSONValue } from "../types";
import { getIsPrimitive } from "../is";

/**
 * Example:
 * ```
 * it("some test", () => {
 *   using _ = captureWarnings();
 *
 *   // some code that will warn
 *   expect(console.warn).toHaveBeenCalledWith("Warning message");
 * });
 * ```
 */
export function captureWarnings() {
  const originalConsoleWarn = console.warn;

  console.warn = vi.fn();

  return {
    [Symbol.dispose]: () => {
      console.warn = originalConsoleWarn;
    },
  };
}

export function jsonBaselineClone(
  json: JSONValue,
  seenMap = new Map<object, string>(),
  path: string = ""
): JSONValue {
  if (getIsPrimitive(json)) return json;

  const maybePath = seenMap.get(json);

  if (maybePath) {
    return { $$ref: maybePath };
  }

  // seenMap.set(json, path);

  // seenMap.set(json, path);

  if (Array.isArray(json)) {
    return json.map((value, index) =>
      jsonBaselineClone(value, seenMap, `${path}/${index}`)
    );
  }

  return Object.fromEntries(
    Object.entries(json).map(([key, value]) => {
      return [key, jsonBaselineClone(value, seenMap, `${path}/${key}`)];
    })
  );
}

export function jsonBaselineTraverse(json: JSONValue) {
  if (getIsPrimitive(json)) return;

  if (Array.isArray(json)) {
    for (const item of json) {
      jsonBaselineTraverse(item);
    }

    return;
  }

  for (const [key, item] of Object.entries(json)) {
    jsonBaselineTraverse(item);
  }
}
