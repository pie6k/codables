import { createCoderType } from "./CoderType";

export const $$undefined = createCoderType(
  "undefined",
  (value) => value === undefined,
  () => null,
  () => undefined
);

function getIsValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}

export const $$date = createCoderType(
  "date",
  (value) => value instanceof Date,
  (date) => (getIsValidDate(date) ? date.toISOString() : null),
  (isoString) => {
    if (isoString === null) return new Date("invalid");

    return new Date(isoString);
  }
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

const symbolsRegistry = new Map<string, symbol>();

function getSymbolName(symbol: symbol): string {
  const nativeKey = Symbol.keyFor(symbol);
  if (nativeKey) return nativeKey;

  const toStringResult = symbol.toString(); // eg "Symbol(foo)"
  return toStringResult.slice(7, -1); // "foo"
}

function registerSymbol(symbol: symbol) {
  const name = getSymbolName(symbol);
  symbolsRegistry.set(name, symbol);
}

function getSymbol(symbolKey: string): symbol {
  return symbolsRegistry.get(symbolKey) ?? Symbol.for(symbolKey);
}

export const $$symbol = createCoderType(
  "symbol",
  (value) => typeof value === "symbol",
  (symbol) => {
    registerSymbol(symbol);
    return getSymbolName(symbol);
  },
  (symbolKey) => getSymbol(symbolKey)
);

const TYPED_ARRAY_MAP = {
  uint8: Uint8Array,
  Uint16Array,
  uint32: Uint32Array,
  int8: Int8Array,
  int16: Int16Array,
  int32: Int32Array,
  float32: Float32Array,
  float64: Float64Array,
} as const;

type TypedArrayTypeName = keyof typeof TYPED_ARRAY_MAP;
type TypedArray = InstanceType<(typeof TYPED_ARRAY_MAP)[TypedArrayTypeName]>;

function getIsTypedArray(value: unknown): value is TypedArray {
  for (const [name, type] of Object.entries(TYPED_ARRAY_MAP)) {
    if (value instanceof type) return true;
  }

  return false;
}

function getTypedArrayType(value: unknown): TypedArrayTypeName | null {
  for (const [name, type] of Object.entries(TYPED_ARRAY_MAP)) {
    if (value instanceof type) return name as TypedArrayTypeName;
  }

  return null;
}

export const $$typedArray = createCoderType(
  "typedArray",
  getIsTypedArray,
  (value) => {
    const type = getTypedArrayType(value)!;
    return {
      type,
      data: Array.from(value),
    };
  },
  ({ type, data }) => new TYPED_ARRAY_MAP[type as TypedArrayTypeName](data)
);

function getSpecialNumberType(
  value: number
): "NaN" | "Infinity" | "-Infinity" | null {
  if (isNaN(value)) return "NaN";
  if (value === Infinity) return "Infinity";
  if (value === -Infinity) return "-Infinity";

  return null;
}

export const $$num = createCoderType(
  "num",
  (value): value is number =>
    typeof value === "number" && !!getSpecialNumberType(value),
  (value) => getSpecialNumberType(value),
  (value) => {
    if (value === "NaN") return NaN;
    if (value === "Infinity") return Infinity;
    if (value === "-Infinity") return -Infinity;

    throw new Error(`Invalid special number type: ${value}`);
  }
);
