import { DecodeContext } from "../DecodeContext";
import { JSONValue } from "../types";
import { TagKey } from "../format";
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

function getOnlyKey(input: Record<string, any>) {
  const keys = Object.keys(input);

  if (keys.length !== 1) return null;

  return keys[0];
}

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

  if (Array.isArray(input)) return "array";

  const key = getOnlyKey(input);

  if (key === null) return "record";

  // It is not a tag, our tag always have something after $$. This will match something like { $$: "foo" }

  if (key.startsWith("$$")) {
    if (key === "$$") return "record";

    if (key === "$$ref") {
      // Match [$$ref, "path"]
      if (typeof input.$$ref === "number") return "ref-tag";

      // Something else, eg {"$$ref": { foo: "bar" }} - not a tag -> treat as normal array
      return "record";
    }

    return key as TagKey;
  }

  if (key.startsWith("~") && ANY_TAG_KEY_REGEXP.test(key)) return "escaped-tag";

  return "record";
}

export type DecodableTypeOf = ReturnType<typeof getDecodableTypeOf>;
