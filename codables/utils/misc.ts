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
