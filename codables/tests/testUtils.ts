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

export function jsonBaselineTraverse(json: JSONValue): JSONValue {
  if (getIsPrimitive(json)) return json;

  if (Array.isArray(json)) return json.map(jsonBaselineTraverse);

  return Object.fromEntries(
    Object.entries(json).map(([key, value]) => [
      key,
      jsonBaselineTraverse(value),
    ])
  );
}
