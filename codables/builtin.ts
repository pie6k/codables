import { decodeSpecialNumber, getSpecialNumberType } from "./utils/numbers";
import {
  getIsTypedArray,
  getTypedArrayConstructor,
  getTypedArrayType,
} from "./utils/typedArrays";

import { createCoderType } from "./CoderType";
import { getErrorExtraProperties } from "./utils/errors";
import { getSymbolKey } from "./utils/misc";

/**
 * This is the list of all built-in coders that are used to encode and decode basic types.
 */

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
  (date) => {
    if (!getIsValidDate(date)) return null;

    return date.toISOString();
  },
  (maybeISOString) => {
    if (maybeISOString === null) return new Date("invalid");

    return new Date(maybeISOString);
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
  (set) => [...set],
  (array) => new Set(array)
);

export const $$map = createCoderType(
  "map",
  (value) => value instanceof Map,
  (map) => [...map.entries()],
  (entries) => new Map(entries)
);

export const $$regexp = createCoderType(
  "regexp",
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
    ) {
      // Optimization - if there are no extra properties, we can just return the message as a string
      return data.message;
    }

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

export const $$symbol = createCoderType(
  "symbol",
  (value) => typeof value === "symbol",
  (symbol) => {
    const symbolKey = getSymbolKey(symbol);

    symbolsRegistry.set(symbolKey, symbol);

    return symbolKey;
  },
  (symbolKey) => {
    return symbolsRegistry.get(symbolKey) ?? Symbol.for(symbolKey);
  }
);

export const $$typedArray = createCoderType(
  "typedArray",
  getIsTypedArray,
  (value) => {
    const type = getTypedArrayType(value)!;
    return {
      type,
      data: [...value],
    };
  },
  ({ type, data }) => {
    const TypedArrayClass = getTypedArrayConstructor(type);

    if (!TypedArrayClass) {
      throw new Error(`Unknown typed array type: ${type}`);
    }

    return new TypedArrayClass(data);
  }
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
  decodeSpecialNumber
);
