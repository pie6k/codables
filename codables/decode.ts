import { JSONArray, JSONObject, JSONValue } from "./types";

import { Coder } from "./Coder";
import { DecodeContext } from "./DecodeContext";
import { TypeWrapper } from "./format";
import { addPathSegment } from "./utils/JSONPointer";
import { getDecodableTypeOf } from "./utils/typeof";
import { getIsEscapedWrapperKey } from "./escape";
import { getIsForbiddenProperty } from "./utils/security";
import { getIsObject } from "./is";
import { unsafeAssertType } from "./utils/assert";

export function decodeInput<T>(
  input: JSONValue,
  context: DecodeContext,
  coder: Coder,
  path: string
): T {
  const decodableTypeOf = getDecodableTypeOf(input);

  if (decodableTypeOf === "primitive") return input as T;

  const entries = Object.entries(input as JSONObject | JSONArray);

  if (decodableTypeOf === "record" && entries.length === 1) {
    const [key, value] = entries[0];

    if (key === "$$ref" && typeof value === "string") {
      const source = context.resolveRefAlias(value);

      if (!source) {
        console.warn(
          `Reference could not be resolved while decoding (${value}) at ${path}`
        );
        /**
         * TODO: Assumption here is that data is always encoded and decoded in the same order,
         * aka if we encode aka. meet some object as the first, it will also be decoded as the first
         * out of all other places where the same reference is used.
         *
         * If this is not the case, we might need some flag to indicate we need to wait and perform
         * aliases resolution later.
         */
        return null as T;
      }

      return source as T;
    }

    if (context.hasCustomTypes && key.startsWith("$$") && key !== "$$ref") {
      unsafeAssertType<TypeWrapper>(input);
      const typeName = key.slice(2);

      const matchingType = coder.getTypeByName(typeName);

      if (!matchingType) {
        console.warn(
          `Unknown custom type: ${typeName} at ${path}. Returning the raw value.`
        );
        return value as T;
      }

      /**
       * Decode data is present at eg input["$$set"], but it might contain some nested data that
       * needs to be decoded first.
       */
      const decodedTypeInput = decodeInput(
        input[matchingType.wrapperKey],
        context,
        coder,
        addPathSegment(path, matchingType.wrapperKey)
      );

      // Now decode data is ready, we can decode it using the type definition
      return matchingType.decoder(decodedTypeInput) as T;
    }

    // If we are dealing with an escaped wrapper key, we need to unescape it
    // eg. { "~$$set": [1, 2, 3] } -> { "$$set": [1, 2, 3] }
    // It happens if someone encoded data that already looks like our internal format.
    if (getIsEscapedWrapperKey(key)) {
      entries[0][0] = key.slice(1);
    }
  }

  const result: any = decodableTypeOf === "array" ? [] : {};

  // The result is not yet ready, but we already have its reference and path, so we can register it
  // in case something eg. directly inside of it references its parent, eg { foo: { parent: <<refToParent>>}}
  context.registerRefIfNeeded(path, result);

  for (const [key, value] of entries) {
    /**
     * We need to skip forbidden properties such as `__proto__`, `constructor`, `prototype`, etc.
     * This could be a potential security risk, allowing attackers to pollute the prototype chain.
     */
    if (getIsForbiddenProperty(key)) continue;

    const fullPath = addPathSegment(path, key);

    const decoded = decodeInput<any>(value, context, coder, fullPath);

    result[key] = decoded;

    if (context.hasRefAliases && getIsObject(decoded)) {
      context.registerRefIfNeeded(fullPath, decoded);
    }
  }

  return result as T;
}
