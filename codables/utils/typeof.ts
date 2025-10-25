import { JSONValue } from "../types";
import { getSpecialNumberType } from "./numbers";
import { unsafeAssertType } from "./assert";

export function getCodableTypeOf(input: unknown) {
  if (input === null) return "primitive";
  if (input === undefined) return "undefined";

  const typeOfInput = typeof input;

  switch (typeOfInput) {
    case "boolean":
    case "string":
      return "primitive";
    case "number":
      if (getSpecialNumberType(input as number)) return "specialNumber";
      return "primitive";
    case "symbol":
      return "symbol";
    case "bigint":
      return "bigint";
    case "function":
      return "function";
  }

  unsafeAssertType<object>(input);

  if (Array.isArray(input)) return "array";

  const inputPrototype = Object.getPrototypeOf(input);

  if (inputPrototype === null || inputPrototype === Object.prototype) {
    return "record";
  }

  return "custom-object";
}

export type CodableTypeOf = ReturnType<typeof getCodableTypeOf>;

export type CodablePrimitive = boolean | string | undefined | number;

export type ResolveCodableTypeOf<T extends CodableTypeOf> =
  T extends "primitive"
    ? CodablePrimitive
    : T extends "undefined"
    ? undefined
    : T extends "specialNumber" | "number"
    ? number
    : T extends "symbol"
    ? symbol
    : T extends "bigint"
    ? bigint
    : T extends "function"
    ? Function
    : T extends "record"
    ? Record<string, unknown>
    : T extends "array"
    ? unknown[]
    : T extends "custom-object"
    ? object
    : never;

export function getDecodableTypeOf(input: JSONValue) {
  if (input === null) return "primitive";

  const typeOfInput = typeof input;

  switch (typeOfInput) {
    case "boolean":
    case "string":
    case "number":
      return "primitive";
    case "symbol":
    case "bigint":
    case "function":
    case "undefined":
      throw new Error(`${typeOfInput} is not a valid JSON value`);
  }

  if (Array.isArray(input)) return "array";

  return "record";
}
