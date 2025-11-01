export function assert(condition: boolean, message: string | Error): asserts condition {
  if (!condition) {
    if (message instanceof Error) {
      throw message;
    }

    throw new Error(message);
  }
}

export function assertGet<T>(value: T | null | undefined, message: string | Error): T {
  assert(value !== null && value !== undefined, message);

  return value;
}

export function narrowType<T>(value: unknown): asserts value is T {}

export function assertNumeric<T extends number = number>(value: string | number): T {
  value = Number(value);

  if (isNaN(value)) throw new Error("Expected number, got NaN");

  return value as T;
}
