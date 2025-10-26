import { DecodeContext } from "../DecodeContext";
import { JSONValue } from "../types";
import { getSpecialNumberType } from "./numbers";

const OBJECT_PROTOTYPE = Object.prototype;

/**
 * The goal here is to geather as much information at once, so later we avoid doing unnecessary checks
 * such as `typeof input` or `Array.isArray(input)` etc.
 */

export function getCodableTypeOf(input: unknown) {
  if (input === null) return "primitive";
  if (input === undefined) return "undefined";

  const typeOfInput = typeof input;

  switch (typeOfInput) {
    case "boolean":
    case "string":
      return "primitive";
    case "number":
      if (getSpecialNumberType(input as number)) return "special-number";
      return "primitive";
    case "symbol":
      return "symbol";
    case "bigint":
      return "bigint";
    case "function":
      return "function";
  }

  if (Array.isArray(input)) return "array";

  const inputPrototype = Object.getPrototypeOf(input);

  if (inputPrototype === OBJECT_PROTOTYPE || inputPrototype === null) {
    // It is a POJO (Plain Old JavaScript Object) aka {}
    return "record";
  }

  // Instance of some class
  return "custom-object";
}

export type CodableTypeOf = ReturnType<typeof getCodableTypeOf>;

export type CodablePrimitive = boolean | string | undefined | number;

const ANY_TAG_KEY_REGEXP = /^~*\$\$.+/;

export function getDecodableTypeOf(input: JSONValue, context: DecodeContext) {
  switch (typeof input) {
    case "boolean":
    case "string":
    case "number":
      return "primitive";
    case "symbol":
    case "bigint":
    case "function":
    case "undefined":
      throw new Error(`undefined is not a valid JSON value`);
  }

  if (input === null) return "primitive";

  if (!Array.isArray(input)) return "record";

  if (input.length !== 2) return "array";

  const key = input[0];

  // It is not matching tag format
  if (typeof key !== "string" || !ANY_TAG_KEY_REGEXP.test(key)) return "array";

  if (key === "$$ref") {
    // Match [$$ref, "path"]
    if (typeof input[1] === "string") return "ref-tag";

    // Something else, eg ["$$ref", { foo: "bar" }] - not a tag -> treat as normal array
    return "array";
  }

  if (key[0] === "~") return "escaped-tag";

  return "type-tag";
}

export type DecodableTypeOf = ReturnType<typeof getDecodableTypeOf>;
