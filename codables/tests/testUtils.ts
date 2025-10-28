import { JSONValue } from "../types";

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
