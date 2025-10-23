import { changeInJSONByMutation, sanitizePath } from "./utils";
import { getIsJSONPrimitive, getIsObject, getIsRecord } from "./is";

import { CircularRefsManager } from "./refs";
import { Coder } from "./Coder";
import { JSONValue } from "./types";

export function finalizeEncodeWithCircularRefs(
  output: JSONValue,
  circularRefsManager: CircularRefsManager
): JSONValue {
  for (const [
    circularRefId,
    path,
  ] of circularRefsManager.iterateCircularRefsSourcePaths()) {
    output = changeInJSONByMutation(output, path, (current) => {
      return {
        [`$$ref:${circularRefId}`]: current,
      };
    });
  }

  return output;
}

export function encodeInput(
  input: unknown,
  circularRefsManager: CircularRefsManager,
  coder: Coder,
  path: string[]
): JSONValue {
  if (getIsJSONPrimitive(input)) {
    return input;
  }

  if (getIsObject(input)) {
    circularRefsManager.handleNewRef(input, path);

    const circularRefAlias = circularRefsManager.getCircularRefAlias(input);

    if (circularRefAlias) return circularRefAlias;
  }

  if (Array.isArray(input)) {
    const result: JSONValue = [];
    for (const [index, item] of input.entries()) {
      result[index] = encodeInput(item, circularRefsManager, coder, [
        ...path,
        index.toString(),
      ]);
    }

    return result;
  }

  if (getIsRecord(input)) {
    const result: JSONValue = {};

    for (const [key, value] of Object.entries(input)) {
      result[key] = encodeInput(value, circularRefsManager, coder, [
        ...path,
        key,
      ]);
    }

    return result;
  }

  const customType = coder.getMatchingTypeFor(input);

  if (customType) {
    const encoded = customType.encode(input);

    return encodeInput(encoded, circularRefsManager, coder, path);
  }

  return null;
}
