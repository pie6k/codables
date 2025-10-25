import { RefAlias } from "./format";
import { getIsJSONPrimitive, getIsObject } from "./is";
import { getIsNestedJSON, iterateNestedJSON } from "./utils";

import { Coder } from "./Coder";
import { maybeEscapeTypeWrapper } from "./escape";
import { JSONValue } from "./types";
import { JSONPointer } from "./utils/JSONPointer";
import { getIsForbiddenProperty } from "./utils/security";
import { EncodeContext } from "./EncodeContext";

export function encodeInput(
  input: unknown,
  encodeContext: EncodeContext,
  coder: Coder,
  path: JSONPointer
): JSONValue {
  if (getIsJSONPrimitive(input)) {
    return input;
  }

  /**
   * Quite edge case:
   * Data that collides with our internal format was explicitly provided.
   * We need to escape it, or otherwise this data would be decoded as a custom type later
   */
  input = maybeEscapeTypeWrapper(input);

  if (getIsObject(input)) {
    // See if this object was already present before at some other path
    const alreadySeenAtPath = encodeContext.getAlreadySeenObjectPath(input);

    if (alreadySeenAtPath !== null) {
      // If so, instead of continuing - return an alias to the already seen object
      return {
        $$ref: alreadySeenAtPath,
      } satisfies RefAlias;
    }

    /**
     * It is seen for the first time, register it so if it is seen again - we can return an alias to the already seen object
     */
    encodeContext.registerNewSeenObject(input, path);
  }

  // Its either a record or an array
  if (getIsNestedJSON(input)) {
    const result: any = Array.isArray(input) ? [] : {};

    for (let [key, value] of iterateNestedJSON(input)) {
      // key = sanitizePathSegment(key);

      /**
       * We are setting properties on the result object, so we need to skip forbidden properties
       * such as `__proto__`, `constructor`, `prototype`, etc.
       *
       * This could be a potential security risk, allowing attackers to pollute the prototype chain.
       */
      if (getIsForbiddenProperty(key)) continue;

      result[key] = encodeInput(
        value,
        encodeContext,
        coder,
        path.addSegment(key)
      );
    }

    return result;
  }

  const matchingType = coder.getMatchingTypeFor(input);

  if (matchingType) {
    /**
     * wrapper is an object like { $$set: [1, 2, 3] }
     *
     * `$$set` tells what type it is, and `[1, 2, 3]` is the data needed to decode it later
     */
    const wrapper = matchingType.encode(input);

    /**
     * It is almost ready, but it is possible that that the data contains some nested data that
     * also needs to be encoded.
     *
     * Let's replace the data with the encoded data.
     */
    wrapper[matchingType.wrapperKey] = encodeInput(
      wrapper[matchingType.wrapperKey],
      encodeContext,
      coder,
      // As object is wrapped in eg. { $$set: [1, 2, 3] }, we need to add the path segment
      path.addSegment(matchingType.wrapperKey)
    );

    return wrapper;
  }

  console.warn("Not able to encode - no matching type found", input);

  return null;
}
