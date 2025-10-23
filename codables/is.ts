import { JSONArray, JSONPrimitive, Primitive } from "./types";

export function getIsJSONPrimitive(value: unknown): value is JSONPrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
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
