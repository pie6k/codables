import { JSONArray, JSONPrimitive, Primitive } from "./types";

export function getIsJSONPrimitive(value: unknown): value is JSONPrimitive {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (typeof value === "boolean") return true;

  if (typeof value === "number") {
    if (isNaN(value)) return false;
    if (value === Infinity) return false;
    if (value === -Infinity) return false;
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
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return value.constructor === Object;
}

export function getIsPrimitive(value: unknown): value is Primitive {
  return getIsJSONPrimitive(value) || value === undefined;
}

export function getIsObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}
