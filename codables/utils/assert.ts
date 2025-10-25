export function assert(
  condition: boolean,
  message: string | Error
): asserts condition {
  if (!condition) {
    if (message instanceof Error) {
      throw message;
    }

    throw new Error(message);
  }
}

export function assertGet<T>(
  value: T | null | undefined,
  message: string | Error
): T {
  assert(value !== null && value !== undefined, message);

  return value;
}

export function unsafeAssertType<T>(value: unknown): asserts value is T {}
