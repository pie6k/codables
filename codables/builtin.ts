import { TypedArrayTypeName, getIsTypedArray, getTypedArrayConstructor, getTypedArrayType } from "./utils/typedArrays";
import { decodeSpecialNumber, getSpecialNumberType } from "./utils/numbers";
import { getSymbolKey, removeUndefinedProperties } from "./utils/misc";

import { EncodeContext } from "./EncodeContext";
import { createCodableType } from "./CodableType";
import { getErrorExtraProperties } from "./utils/errors";

/**
 * This is the list of all built-in coders that are used to encode and decode basic types.
 *
 * Note: put the most popular types at the beginning of the file to improve encoding performance.
 */

function getIsValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}

export const $$date = createCodableType(
  "Date",
  (value) => value instanceof Date,
  (date) => {
    if (!getIsValidDate(date)) return null;

    return date.toISOString();
  },
  (maybeISOString) => {
    if (maybeISOString === null) return new Date("invalid");

    return new Date(maybeISOString);
  },
  {
    isFlat: true,
  },
);

export const $$set = createCodableType(
  "Set",
  (value) => value instanceof Set,
  (set) => [...set],
  (array, context) => {
    return new Set(array);
  },
);

export const $$map = createCodableType(
  "Map",
  (value) => value instanceof Map,
  (map) => [...map.entries()],
  (entries) => new Map(entries),
);

export const $$error = createCodableType(
  "Error",
  (value) => value instanceof Error,
  (error: Error, context: EncodeContext) => {
    const shouldIncludeErrorStack = context.options?.includeErrorStack ?? false;

    const extraProperties = getErrorExtraProperties(error) ?? undefined;
    const name = error.name && error.name !== "Error" ? error.name : undefined;
    const cause = error.cause;
    const message = error.message;
    const stack = shouldIncludeErrorStack ? error.stack : undefined;

    if (!extraProperties && !name && !cause && !stack) {
      return message;
    }

    return removeUndefinedProperties({
      message,
      name,
      cause,
      properties: extraProperties,
      stack,
    });
  },
  (messageOrData) => {
    if (typeof messageOrData === "string") return new Error(messageOrData);

    const { message, name, cause, properties, stack } = messageOrData;

    const error = new Error(message, { cause });

    if (stack) {
      error.stack = stack;
    }

    if (name && name !== "Error") {
      error.name = name;
    }

    if (properties) {
      Object.assign(error, properties);
    }

    return error;
  },
);

export const $$undefined = createCodableType(
  "undefined",
  (value) => value === undefined,
  () => null,
  () => undefined,
  {
    isFlat: true,
  },
);

export const $$bigInt = createCodableType(
  "BigInt",
  (value) => typeof value === "bigint",
  (bigInt) => bigInt.toString(),
  (string) => BigInt(string),
  {
    isFlat: true,
  },
);

export const $$regexp = createCodableType(
  "RegExp",
  (value) => value instanceof RegExp,
  ({ source, flags }) => {
    if (flags) return [source, flags] as const;

    // Optimization - if there are no flags, we can just return the source as a string
    return source;
  },
  (sourceOrSourceAndFlags) => {
    if (typeof sourceOrSourceAndFlags === "string") {
      return new RegExp(sourceOrSourceAndFlags);
    }

    const [source, flags] = sourceOrSourceAndFlags;
    return new RegExp(source, flags);
  },
  {
    isFlat: true,
  },
);

export const $$url = createCodableType(
  "URL",
  (value) => value instanceof URL,
  (url) => url.toString(),
  (string) => new URL(string),
  {
    isFlat: true,
  },
);

const symbolsRegistry = new Map<string, symbol>();

export const $$symbol = createCodableType(
  "Symbol",
  (value) => typeof value === "symbol",
  (symbol) => {
    const symbolKey = getSymbolKey(symbol);

    symbolsRegistry.set(symbolKey, symbol);

    return symbolKey;
  },
  (symbolKey) => symbolsRegistry.get(symbolKey) ?? Symbol.for(symbolKey),
  {
    isFlat: true,
  },
);

export const $$typedArray = createCodableType(
  "typedArray",
  getIsTypedArray,
  (value) => {
    return {
      type: getTypedArrayType(value),
      data: [...value],
    } as const;
  },
  ({ type, data }) => {
    return new (getTypedArrayConstructor(type))(data);
  },
  {
    // Almost not, but can contain NaN
    isFlat: false,
  },
);

/**
 * Handles special numbers like NaN, Infinity, -Infinity, -0 that are not correctly serialized by
 * regular JSON
 */
export const $$num = createCodableType(
  "num",
  (value): value is number => typeof value === "number" && !!getSpecialNumberType(value),
  getSpecialNumberType,
  decodeSpecialNumber,
  {
    isFlat: true,
  },
);

export const $$urlSearchParams = createCodableType(
  "URLSearchParams",
  (value) => value instanceof URLSearchParams,
  (urlSearchParams) => urlSearchParams.toString(),
  (string) => new URLSearchParams(string),
  {
    isFlat: false,
  },
);
