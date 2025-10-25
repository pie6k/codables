import { JSONArray, JSONPrimitive, Primitive } from "./types";

import { getSpecialNumberType } from "./utils/numbers";

export function getIsJSONPrimitive(value: unknown): value is JSONPrimitive {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (typeof value === "boolean") return true;

  if (typeof value === "number") {
    if (getSpecialNumberType(value)) return false;

    return true;
  }

  return false;
}

/**
 * Returns true only if the value is POJO (Plain Old JavaScript Object)
 *
 * Returns false for instances of classes, functions, etc.
 */
export function getIsRecord(value: unknown): value is Record<string, unknown> {
  if (!value) return false;

  const valuePrototype = Object.getPrototypeOf(value);

  return valuePrototype === Object.prototype || valuePrototype === null;
}

export function getIsPrimitive(value: unknown): value is Primitive {
  return getIsJSONPrimitive(value) || value === undefined;
}

export function getIsObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}
