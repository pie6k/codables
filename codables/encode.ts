import { CircularRefsManager, createCircularRefAlias } from "./refs";
import { addPathSegment, sanitizePathSegment } from "./utils/paths";
import {
  assertNotForbiddenProperty,
  getIsForbiddenProperty,
} from "./utils/security";
import { escapeTypeWrapper, getIsTypeWrapper } from "./format";
import { getIsJSONPrimitive, getIsObject } from "./is";
import { getIsNestedJSON, iterateNestedJSON } from "./utils";

import { Coder } from "./Coder";
import { JSONValue } from "./types";
import { typedEntries } from "./utils/misc";

export function encodeInput(
  input: unknown,
  circularRefsManager: CircularRefsManager,
  coder: Coder,
  path: string
): JSONValue {
  if (getIsJSONPrimitive(input)) {
    return input;
  }

  if (getIsTypeWrapper(input)) {
    input = escapeTypeWrapper(input);
  }

  if (getIsObject(input)) {
    const alreadySeenPath = circularRefsManager.getAlreadySeenObjectPath(input);

    if (alreadySeenPath !== null) {
      return createCircularRefAlias(alreadySeenPath);
    }

    circularRefsManager.handleTraversedObject(input, path);
  }

  if (getIsNestedJSON(input)) {
    const result: any = Array.isArray(input) ? [] : {};

    for (const [key, value] of iterateNestedJSON(input)) {
      if (
        getIsForbiddenProperty(key) ||
        getIsForbiddenProperty(sanitizePathSegment(key))
      ) {
        continue;
      }

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

    for (const [key, value] of typedEntries(encoded)) {
      encoded[key] = encodeInput(
        value,
        circularRefsManager,
        coder,
        addPathSegment(path, key)
      );
    }

    return encoded;
  }

  console.warn("Not able to encode - no matching type found", input);

  return null;
}
