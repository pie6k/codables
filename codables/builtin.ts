import { createCoderType } from "./CoderType";

export const $$undefined = createCoderType(
  "undefined",
  (value) => value === undefined,
  () => null,
  () => undefined
);

export const $$date = createCoderType(
  "date",
  (value) => value instanceof Date,
  (date) => date.toISOString(),
  (isoString) => new Date(isoString)
);

export const $$bigInt = createCoderType(
  "bigInt",
  (value) => typeof value === "bigint",
  (bigInt) => bigInt.toString(),
  (string) => BigInt(string)
);

export const $$set = createCoderType(
  "set",
  (value) => value instanceof Set,
  (set) => Array.from(set),
  (array) => new Set(array)
);

export const $$map = createCoderType(
  "map",
  (value) => value instanceof Map,
  (map) => Array.from(map.entries()),
  (entries) => new Map(entries)
);

export const $$regexp = createCoderType(
  "regexp",
  (value) => value instanceof RegExp,
  ({ source, flags }) => [source, flags] as const,
  ([source, flags]) => new RegExp(source, flags)
);

export const $$error = createCoderType(
  "error",
  (value) => value instanceof Error,
  (error) => ({
    message: error.message,
    name: error.name,
    cause: error.cause,
  }),
  ({ message, name, cause }) => {
    const error = new Error(message, { cause });

    if (name) {
      error.name = name;
    }

    return error;
  }
);

export const $$url = createCoderType(
  "url",
  (value) => value instanceof URL,
  (url) => url.toString(),
  (string) => new URL(string)
);

export const $$symbol = createCoderType(
  "symbol",
  (value) => typeof value === "symbol",
  (symbol) => symbol.toString(),
  (string) => Symbol(string)
);
