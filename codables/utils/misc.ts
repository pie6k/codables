export type Thunk<T> = T | (() => Thunk<T>);

export function resolveThunk<T>(thunk: Thunk<T>): T {
  let result = thunk;

  while (typeof result === "function") {
    result = (result as () => Thunk<T>)();
  }

  return result;
}

export function getSymbolKey(symbol: symbol): string {
  const nativeKey = Symbol.keyFor(symbol);
  if (nativeKey) return nativeKey;

  const toStringResult = symbol.toString(); // eg "Symbol(foo)"
  return toStringResult.slice(7, -1); // "foo"
}

export function removeUndefinedProperties<T extends Record<string, unknown>>(input: T): T {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(input)) {
    const value = input[key as keyof T];
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}
