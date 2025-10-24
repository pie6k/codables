import { addPathSegment, unescapePathSegment } from "./utils/paths";
import {
  assertNotForbiddenProperty,
  getIsForbiddenProperty,
} from "./utils/security";
import { getIsJSONPrimitive, getIsObject, getIsRecord } from "./is";
import { getIsNestedJSON, iterateNestedJSON } from "./utils";
import {
  getIsRefAlias,
  getIsTypeWrapper,
  getTypeWrapperTypeName,
} from "./format";

import { Coder } from "./Coder";
import { JSONValue } from "./types";

type ObjectsMap = Map<string, object>;

const ESCAPED_TYPE_KEY_REGEXP = /^~+\$\$/;

function maybeUnescapeInput(input: JSONValue): JSONValue {
  if (!getIsRecord(input)) return input;

  const entries = Object.entries(input);

  if (entries.length !== 1) return input;

  const [key, value] = entries[0];

  if (!ESCAPED_TYPE_KEY_REGEXP.test(key)) return input;

  const unescapedKey = key.slice(1);

  return { [unescapedKey]: value } as JSONValue;
}

export function decodeInput<T>(
  input: JSONValue,
  objectsMap: ObjectsMap,
  coder: Coder,
  path: string
): T {
  if (getIsJSONPrimitive(input)) {
    return input as T;
  }

  /**
   * See if this is an object like { $$set: [1, 2, 3] }
   * If so, it is a custom type and we need to decode it.
   */
  if (getIsTypeWrapper(input)) {
    // Eg. "set"
    const typeName = getTypeWrapperTypeName(input);

    // Get the type definition so we can decode the data
    const matchingType = coder.getTypeByName(typeName);

    if (!matchingType) {
      throw new Error(`Unknown custom type: ${typeName}`);
    }

    /**
     * Decode data is present at eg input["$$set"], but it might contain some nested data that
     * needs to be decoded first.
     */
    const decodedData = decodeInput(
      input[matchingType.wrapperKey],
      objectsMap,
      coder,
      addPathSegment(path, matchingType.wrapperKey)
    );

    // Now decode data is ready, we can decode it using the type definition
    return matchingType.decoder(decodedData) as T;
  }

  input = maybeUnescapeInput(input);

  /**
   * This is a reference to some other object that was already decoded,
   * simply resolve it and return the object reference
   */
  if (getIsRefAlias(input)) {
    const refPath = input.$$ref;

    const source = objectsMap.get(refPath);

    if (!source) {
      /**
       * TODO: Assumption here is that data is always encoded and decoded in the same order,
       * aka if we encode aka. meet some object as the first, it will also be decoded as the first
       * out of all other places where the same reference is used.
       *
       * If this is not the case, we might need some flag to indicate we need to wait and perform
       * aliases resolution later.
       */
      throw new Error(`Source not found for ref path: ${refPath}`);
    }

    return source as T;
  }

  if (getIsNestedJSON(input)) {
    const result: any = Array.isArray(input) ? [] : {};

    // Register the reference instantly in case something that will now be decoded references this object
    objectsMap.set(path, result);

    for (let [key, value] of iterateNestedJSON(input)) {
      /**
       * In the input, the key might be escaped, so we need to unescape it.
       * - if in original we had object like { "foo.bar": "baz" }, encoded version we have here is { "foo\.bar": "baz" }
       * - if in original we had object colliding with our internal format
       *   like { "$$foo": "baz" }, encoded version we have here is { "\\$$foo": "baz" }
       */
      // eg. "foo\.bar" -> "foo.bar"
      key = unescapePathSegment(key);

      /**
       * We need to skip forbidden properties such as `__proto__`, `constructor`, `prototype`, etc.
       * This could be a potential security risk, allowing attackers to pollute the prototype chain.
       */
      if (getIsForbiddenProperty(key)) {
        continue;
      }

      const decoded = decodeInput<any>(
        value,
        objectsMap,
        coder,
        addPathSegment(path, key)
      );

      if (getIsObject(decoded)) {
        objectsMap.set(addPathSegment(path, key), decoded);
      }

      result[key as keyof typeof result] = decoded;
    }

    return result as T;
  }

  // throw new Error(`Non-json value was passed to decode at path: ${path}`);

  return input as T;
}
