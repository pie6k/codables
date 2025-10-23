import { JSONObject, JSONValue } from "./types";

type SanitizablePathSegment = string | number;

function sanitizePathSegment(segment: SanitizablePathSegment): string {
  if (typeof segment === "number") {
    return `${segment}`;
  }

  return segment;
}

export type PropertyPath = string[];

export function sanitizePath(path: SanitizablePathSegment[]): PropertyPath {
  return path.map(sanitizePathSegment);
}

export function changeInJSONByMutation(
  input: JSONValue,
  propertyPath: PropertyPath,
  valueChanger: (current: JSONValue) => JSONValue
): JSONValue {
  if (propertyPath.length === 0) {
    return valueChanger(input);
  }

  let pointer = input;

  for (let i = 0; i < propertyPath.length; i++) {
    const propertyName = propertyPath[i];
    const isLastProperty = i === propertyPath.length - 1;

    const propertyValue = Reflect.get(
      pointer as JSONObject,
      propertyName
    ) as JSONObject;

    if (!isLastProperty) {
      pointer = propertyValue;
      continue;
    }

    Reflect.set(
      pointer as JSONObject,
      propertyName,
      valueChanger(propertyValue)
    );
    return pointer;
  }

  return pointer;
}
