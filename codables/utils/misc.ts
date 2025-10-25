export type Thunk<T> = T | (() => T);

export function resolveThunk<T>(thunk: Thunk<T>): T {
  if (typeof thunk === "function") {
    return (thunk as () => T)();
  }

  return thunk;
}

export function* typedEntries<T extends object>(input: T) {
  for (const [key, value] of Object.entries(input)) {
    yield [key as keyof T, value] as const;
  }
}

export function getSymbolKey(symbol: symbol): string {
  const nativeKey = Symbol.keyFor(symbol);
  if (nativeKey) return nativeKey;

  const toStringResult = symbol.toString(); // eg "Symbol(foo)"
  return toStringResult.slice(7, -1); // "foo"
}

export function removeUndefinedProperties<T extends Record<string, unknown>>(
  input: T
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}
