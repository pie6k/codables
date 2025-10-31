import { $$bigInt, $$symbol } from "./builtin";
import { MAYBE_ESCAPED_ARRAY_REF_ID_REGEXP, getIsMaybeEscapedTagKey } from "./format";
import { maybeEncodeNumber, maybeEscapeSpecialString } from "./specialStrings";

import { Coder } from "./Coder";
import { EncodeContext } from "./EncodeContext";
import { JSONValue } from "./types";
import { createTag } from "./CodableType";
import { getIsForbiddenProperty } from "./utils/security";
import { narrowType } from "./utils/assert";

const OBJECT_PROTOTYPE = Object.prototype;

export function performEncode(input: unknown, encodeContext: EncodeContext, coder: Coder): JSONValue {
  if (input === null) return null;

  switch (typeof input) {
    case "boolean":
      return input;
    case "string":
      return maybeEscapeSpecialString(input);
    case "number":
      return maybeEncodeNumber(input);
    case "symbol":
      return $$symbol.encodeTag(input, encodeContext);
    case "bigint":
      return $$bigInt.encodeTag(input, encodeContext);
    case "undefined":
      return `$$undefined`;
    // We do not encode functions
    case "function":
      return null;
  }

  // Either a record or an array

  if (encodeContext.preserveReferences) {
    // See if this object was already present before at some other path
    const refId = encodeContext.getAlreadySeenObjectId(input);

    if (refId !== null) {
      // If so, instead of continuing - return an alias to the already seen object
      return createTag("ref", refId);
    }

    /**
     * It is seen for the first time, register it so if it is seen again - we can return an alias to the already seen object
     */
    encodeContext.registerNewSeenObject(input);
  }

  if (Array.isArray(input)) {
    const result: any[] = [];

    encodeContext.registerEncoded(input, result);

    for (let i = 0; i < input.length; i++) {
      const inputValue = input[i];

      if (i === 0 && typeof inputValue === "string" && MAYBE_ESCAPED_ARRAY_REF_ID_REGEXP.test(inputValue)) {
        result[i] = `~${inputValue}`;
        continue;
      }

      // We push instead of `result[i], because it is possible that array was marked referenced with markEncodedAsReferenced
      result.push(performEncode(inputValue, encodeContext, coder));
    }

    return result;
  }

  const inputPrototype = Object.getPrototypeOf(input);

  // Plain record aka {}
  if (inputPrototype === OBJECT_PROTOTYPE || inputPrototype === null) {
    const keys = Object.keys(input);

    const result = {} as Record<string, any>;

    encodeContext.registerEncoded(input, result);

    // Seems the fastest way to iterate (https://jsfiddle.net/hikarii_flow/295v7sb3/)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      narrowType<keyof typeof input>(key);

      const encodeKey = getIsMaybeEscapedTagKey(key) ? `~${key}` : key;

      /**
       * We are setting properties on the result object, so we need to skip forbidden properties
       * such as `__proto__`, `constructor`, `prototype`, etc.
       *
       * This could be a potential security risk, allowing attackers to pollute the prototype chain.
       */
      if (getIsForbiddenProperty(key)) continue;

      result[encodeKey] = performEncode(input[key], encodeContext, coder);
    }

    return result;
  }

  // Custom object

  const matchingType = coder.getMatchingTypeForObject(input);

  if (!matchingType) {
    switch (encodeContext.unknownMode) {
      case "unchanged":
        return input as JSONValue;
      case "null":
        return null;
      case "throw":
        throw new Error("Not able to encode - no matching type found", input);
    }
  }

  /**
   * wrapper is an object like { $$set: [1, 2, 3] }
   *
   * `$$set` tells what type it is, and `[1, 2, 3]` is the data needed to decode it later
   */
  let encodedTypeData = matchingType.encode(input, encodeContext);

  if (!matchingType.isFlat) {
    encodedTypeData = performEncode(encodedTypeData, encodeContext, coder);
  }

  const tag = matchingType.createTag(encodedTypeData);

  encodeContext.registerEncoded(input, tag);

  return tag;
}
