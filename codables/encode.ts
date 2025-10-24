import { CircularRefsManager, createCircularRefAlias } from "./refs";
import { addPathSegment, sanitizePathSegment } from "./utils/paths";
import {
  assertNotForbiddenProperty,
  getIsForbiddenProperty,
} from "./utils/security";
import { getIsJSONNested, iterateJSONNested } from "./utils";
import { getIsJSONPrimitive, getIsObject } from "./is";

import { Coder } from "./Coder";
import { JSONValue } from "./types";

export function encodeInput(
  input: unknown,
  circularRefsManager: CircularRefsManager,
  coder: Coder,
  path: string
): JSONValue {
  if (getIsJSONPrimitive(input)) {
    return input;
  }

  if (getIsObject(input)) {
    const alreadySeenPath = circularRefsManager.getAlreadySeenObjectPath(input);

    if (alreadySeenPath !== null) {
      return createCircularRefAlias(alreadySeenPath);
    }

    circularRefsManager.handleTraversedObject(input, path);
  }

  if (getIsJSONNested(input)) {
    const result: any = Array.isArray(input) ? [] : {};

    for (const [key, value] of iterateJSONNested(input)) {
      assertNotForbiddenProperty(key);
      assertNotForbiddenProperty(sanitizePathSegment(key));

      result[sanitizePathSegment(key)] = encodeInput(
        value,
        circularRefsManager,
        coder,
        addPathSegment(path, key)
      );
    }

    return result;
  }

  const customType = coder.getMatchingTypeFor(input);

  if (customType) {
    const encoded = customType.encode(input);

    return encodeInput(encoded, circularRefsManager, coder, path);
  }

  console.warn("Not able to encode - no matching type found", input);

  return null;
}
