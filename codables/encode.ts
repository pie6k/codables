import { addPathSegment } from "./utils/JSONPointer";

import { $$bigInt, $$num, $$symbol, $$undefined } from "./builtin";
import { Coder } from "./Coder";
import { EncodeContext } from "./EncodeContext";
import { RefAlias } from "./format";
import { JSONPrimitive, JSONValue } from "./types";
import { unsafeAssertType } from "./utils/assert";
import { getIsForbiddenProperty } from "./utils/security";
import { getCodableTypeOf } from "./utils/typeof";

/**
 * It is either our tag with $$ or already escaped tag (~$$) which we will escape further.
 * This is very rare case:
 * - someone encoded data that already looks like our internal format
 * - someone encoded data, and then encoded encoded data again instead of decoding it
 */
function getShouldEscapeKey(key: string) {
  return /^~*\$\$/.test(key);
}

export function encodeInput(
  input: unknown,
  encodeContext: EncodeContext,
  coder: Coder,
  path: string
): JSONValue {
  const codableTypeOf = getCodableTypeOf(input);

  switch (codableTypeOf) {
    case "primitive":
      return input as JSONPrimitive;
    case "specialNumber":
      return $$num.encode(input as number);
    case "symbol":
      return $$symbol.encode(input as symbol);
    case "bigint":
      return $$bigInt.encode(input as bigint);
    case "undefined":
      return $$undefined.encode(input as undefined);
    case "function":
      return null;
  }

  // Either a record or an array
  unsafeAssertType<object>(input);

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
      addPathSegment(path, matchingType.wrapperKey)
    );

    return wrapper;
  }

  const entries = Object.entries(input);

  /**
   * Quite edge case:
   * Data that collides with our internal format was explicitly provided.
   * We need to escape it, or otherwise this data would be decoded as a custom type later
   *
   * Will turn eg { $$set: [1, 2, 3] } into { "~$$set": [1, 2, 3] }
   */
  if (entries.length === 1 && getShouldEscapeKey(entries[0][0])) {
    // Escape the key
    entries[0][0] = `~${entries[0][0]}`;
  }

  const result: any = codableTypeOf === "array" ? [] : {};

  for (const [key, value] of entries) {
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
      addPathSegment(path, key)
    );
  }

  return result;
}
