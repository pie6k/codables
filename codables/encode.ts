import { $$bigInt, $$num, $$symbol, $$undefined } from "./builtin";
import { JSONPrimitive, JSONValue } from "./types";

import { Coder } from "./Coder";
import { EncodeContext } from "./EncodeContext";
import { addPathSegment } from "./utils/JSONPointer";
import { createTag } from "./CoderType";
import { getCodableTypeOf } from "./utils/typeof";
import { getIsForbiddenProperty } from "./utils/security";
import { narrowType } from "./utils/assert";

/**
 * It is either our tag with $$ or already escaped tag (~$$) which we will escape further.
 * This is very rare case:
 * - someone encoded data that already looks like our internal format
 * - someone encoded data, and then encoded encoded data again instead of decoding it
 */
function getShouldEscapeKey(key: string) {
  return /^~*\$\$/.test(key);
}

function getShouldEscapeMaybeTag(input: Record<string, any>): boolean {
  return (
    input.length === 2 &&
    typeof input[0] === "string" &&
    getShouldEscapeKey(input[0])
  );
}

export function encodeInput(
  input: unknown,
  encodeContext: EncodeContext,
  coder: Coder,
  path: string,
): JSONValue {
  const codableTypeOf = getCodableTypeOf(input);

  switch (codableTypeOf) {
    case "primitive":
      return input as JSONPrimitive;
    case "special-number":
      return $$num.encodeTag(input as number);
    case "symbol":
      return $$symbol.encodeTag(input as symbol);
    case "bigint":
      return $$bigInt.encodeTag(input as bigint);
    case "undefined":
      return $$undefined.encodeTag(input as undefined);
    case "function":
      return null;
  }

  // Either a record or an array
  narrowType<object>(input);

  // See if this object was already present before at some other path
  const alreadySeenAtPath = encodeContext.getAlreadySeenObjectPath(input);

  if (alreadySeenAtPath !== null) {
    // If so, instead of continuing - return an alias to the already seen object
    return createTag("ref", alreadySeenAtPath);
  }

  /**
   * It is seen for the first time, register it so if it is seen again - we can return an alias to the already seen object
   */
  encodeContext.registerNewSeenObject(input, path);

  if (codableTypeOf === "custom-object") {
    const matchingType = coder.getMatchingTypeFor(input);

    if (!matchingType) {
      console.warn("Not able to encode - no matching type found", input);
      return null;
    }

    /**
     * wrapper is an object like { $$set: [1, 2, 3] }
     *
     * `$$set` tells what type it is, and `[1, 2, 3]` is the data needed to decode it later
     */

    const tagKey = matchingType.tagKey;

    return {
      [tagKey]: encodeInput(
        matchingType.encode(input),
        encodeContext,
        coder,
        addPathSegment(path, tagKey),
      ),
    };
  }

  if (codableTypeOf === "array") {
    narrowType<any[]>(input);

    const result: any[] = [];

    for (let i = 0; i < input.length; i++) {
      result[i] = encodeInput(
        input[i],
        encodeContext,
        coder,
        addPathSegment(path, i),
      );
    }

    return result;
  }

  // Record
  const keys = Object.keys(input);

  /**
   * Quite edge case:
   * Data that collides with our internal format was explicitly provided.
   * We need to escape it, or otherwise this data would be decoded as a custom type later
   *
   * Will turn eg { $$set: [1, 2, 3] } into { "~$$set": [1, 2, 3] }
   */

  if (keys.length === 1 && getShouldEscapeKey(keys[0])) {
    input = { [`~${keys[0]}`]: input[keys[0] as keyof typeof input] };
    keys[0] = `~${keys[0]}`;

    narrowType<Record<string, any>>(input);
  }

  const result = {} as Record<string, any>;

  for (const key of keys) {
    // key = sanitizePathSegment(key);

    /**
     * We are setting properties on the result object, so we need to skip forbidden properties
     * such as `__proto__`, `constructor`, `prototype`, etc.
     *
     * This could be a potential security risk, allowing attackers to pollute the prototype chain.
     */
    if (getIsForbiddenProperty(key)) continue;

    result[key] = encodeInput(
      input[key as keyof typeof input],
      encodeContext,
      coder,
      addPathSegment(path, key),
    );
  }

  return result;
}
