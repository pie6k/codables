import {
  getIsTypedArray,
  getTypedArrayConstructor,
  getTypedArrayType,
} from "./utils/typedArrays";

import { createCoderType } from "./CoderType";
import { getErrorExtraProperties } from "./utils/errors";
import { getSpecialNumberType } from "./utils/numbers";

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
  ({ source, flags }) => {
    if (flags) return [source, flags] as const;

    return source;
  },
  (sourceOrSourceAndFlags) => {
    if (typeof sourceOrSourceAndFlags === "string") {
      return new RegExp(sourceOrSourceAndFlags);
    }

    const [source, flags] = sourceOrSourceAndFlags;
    return new RegExp(source, flags);
  }
);

interface ErrorData {
  message: string;
  name?: string;
  cause?: unknown;
  properties?: Record<string, unknown>;
}

export const $$error = createCoderType(
  "error",
  (value) => value instanceof Error,
  (error) => {
    const data: ErrorData = {
      message: error.message,
    };

    const extraProperties = getErrorExtraProperties(error);

    if (extraProperties) {
      data.properties = extraProperties;
    }

    if (error.name && error.name !== "Error") {
      data.name = error.name;
    }

    if (error.cause) {
      data.cause = error.cause;
    }

    if (
      data.name === undefined &&
      data.cause === undefined &&
      data.properties === undefined
    )
      return data.message;

    return data;
  },
  (messageOrData: string | ErrorData) => {
    if (typeof messageOrData === "string") return new Error(messageOrData);

    const { message, name, cause, properties } = messageOrData;

    const error = new Error(message, { cause });

    if (name && name !== "Error") {
      error.name = name;
    }

    if (properties) {
      Object.assign(error, properties);
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
  ({ type, data }) => new (getTypedArrayConstructor(type))(data)
);

export const $$num = createCoderType(
  "num",
  (value): value is number =>
    typeof value === "number" && !!getSpecialNumberType(value),
  (value) => getSpecialNumberType(value),
  (value) => {
    if (value === "NaN") return NaN;
    if (value === "Infinity") return Infinity;
    if (value === "-Infinity") return -Infinity;
    if (value === "-0") return -0;

    throw new Error(`Invalid special number type: ${value}`);
  }
);
