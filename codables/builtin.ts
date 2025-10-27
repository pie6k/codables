import {
  TypedArrayTypeName,
  getIsTypedArray,
  getTypedArrayConstructor,
  getTypedArrayType,
} from "./utils/typedArrays";
import { decodeSpecialNumber, getSpecialNumberType } from "./utils/numbers";
import { getSymbolKey, removeUndefinedProperties } from "./utils/misc";

import { createCoderType } from "./CoderType";
import { getErrorExtraProperties } from "./utils/errors";

/**
 * This is the list of all built-in coders that are used to encode and decode basic types.
 *
 * Note: put the most popular types at the beginning of the file to improve encoding performance.
 */

function getIsValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}

export const $$date = createCoderType(
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
);

export const $$set = createCoderType(
  "Set",
  (value) => value instanceof Set,
  (set) => [...set],
  (array) => new Set(array),
);

export const $$map = createCoderType(
  "Map",
  (value) => value instanceof Map,
  (map) => [...map.entries()],
  (entries) => new Map(entries),
);

export const $$error = createCoderType(
  "Error",
  (value) => value instanceof Error,
  (error: Error) => {
    const extraProperties = getErrorExtraProperties(error) ?? undefined;
    const name = error.name && error.name !== "Error" ? error.name : undefined;
    const cause = error.cause;
    const message = error.message;

    if (!extraProperties && !name && !cause) {
      return message;
    }

    return removeUndefinedProperties({
      message,
      name,
      cause,
      properties: extraProperties,
    });
  },
  (messageOrData) => {
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
  },
);

export const $$undefined = createCoderType(
  "undefined",
  (value) => value === undefined,
  () => null,
  () => undefined,
);

export const $$bigInt = createCoderType(
  "BigInt",
  (value) => typeof value === "bigint",
  (bigInt) => bigInt.toString(),
  (string) => BigInt(string),
);

export const $$regexp = createCoderType(
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
);

export const $$url = createCoderType(
  "URL",
  (value) => value instanceof URL,
  (url) => url.toString(),
  (string) => new URL(string),
);

const symbolsRegistry = new Map<string, symbol>();

export const $$symbol = createCoderType(
  "Symbol",
  (value) => typeof value === "symbol",
  (symbol) => {
    const symbolKey = getSymbolKey(symbol);

    symbolsRegistry.set(symbolKey, symbol);

    return symbolKey;
  },
  (symbolKey) => symbolsRegistry.get(symbolKey) ?? Symbol.for(symbolKey),
);

export const $$typedArray = createCoderType(
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
);

/**
 * Handles special numbers like NaN, Infinity, -Infinity, -0 that are not correctly serialized by
 * regular JSON
 */
export const $$num = createCoderType(
  "num",
  (value): value is number =>
    typeof value === "number" && !!getSpecialNumberType(value),
  getSpecialNumberType,
  decodeSpecialNumber,
);

export const $$urlSearchParams = createCoderType(
  "URLSearchParams",
  (value) => value instanceof URLSearchParams,
  (urlSearchParams) => urlSearchParams.toString(),
  (string) => new URLSearchParams(string),
);
