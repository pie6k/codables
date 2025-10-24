export function* typedEntries<T extends object>(input: T) {
  for (const [key, value] of Object.entries(input)) {
    yield [key as keyof T, value] as const;
  }
}
