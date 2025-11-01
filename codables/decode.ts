import {
  ARRAY_REF_ID_REGEXP,
  ESCAPED_ARRAY_REF_ID_REGEXP,
  MAYBE_ESCAPED_ARRAY_REF_ID_REGEXP,
  RefAlias,
  Tag,
  TagKey,
  getIsEscapedTagKey,
  getIsReferencedTag,
  getIsTagKey,
} from "./format";
import { Path, addNumberPathSegment, addPathSegment } from "./utils/path";

import { Coder } from "./Coder";
import { DecodeContext } from "./DecodeContext";
import { JSONValue } from "./types";
import { decodeMaybeSpecialString } from "./specialStrings";
import { getIsForbiddenProperty } from "./utils/security";

function resolveRefAlias<T>(input: RefAlias, context: DecodeContext, path: Path): T {
  const referencedObject = context.resolveRefId(input.$$ref);

  if (!referencedObject) {
    context.registerPendingReference(input.$$ref, path);

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

  return referencedObject as T;
}

function resolveTypeTag<T>(tag: Tag<JSONValue>, tagKey: TagKey, context: DecodeContext, coder: Coder, path: Path): T {
  const typeName = tagKey.slice(2); // eg "$$set" -> "set"

  const matchingType = coder.getTypeByName(typeName);

  if (!matchingType) {
    console.warn(`Unknown custom type: ${typeName}. Returning the raw value.`);
    return tag[tagKey] as T;
  }

  /**
   * Decode data is present at eg input["$$set"], but it might contain some nested data that
   * needs to be decoded first.
   */

  const payload = decodeInput(tag[tagKey], context, coder, addPathSegment(path, tagKey));

  const result = matchingType.decode(payload, context, tag.$$id ?? null) as T;

  if (getIsReferencedTag(tag)) {
    // We know it is an object, otherwise nothing would be able to reference it in the first place
    context.registerRef(tag.$$id, result as object);
  }

  return result;
}

function getMaybeCustomTypeTag(refId: number | undefined, keys: string[]) {
  if (refId === undefined) {
    const first = keys[0];

    if (keys.length === 1 && getIsTagKey(first)) return first as TagKey;

    return false as const;
  }

  if (keys.length !== 2) return false as const;

  if (keys[0] === "$$id" && getIsTagKey(keys[1])) return keys[1] as TagKey;
  if (keys[1] === "$$id" && getIsTagKey(keys[0])) return keys[0] as TagKey;

  return false as const;
}

export function decodeInput<T>(input: JSONValue, context: DecodeContext, coder: Coder, path: Path): T {
  if (input === null) return input as T;

  switch (typeof input) {
    case "string":
      return decodeMaybeSpecialString(input) as T;
    case "boolean":
    case "number":
      return input as T;
    case "symbol":
    case "bigint":
    case "function":
    case "undefined":
      throw new Error(`undefined is not a valid JSON value`);
  }

  if (Array.isArray(input)) {
    const result: any[] = [];

    const first = input[0];

    if (typeof first === "string" && (first.startsWith("~") || first.startsWith("$$"))) {
      if (MAYBE_ESCAPED_ARRAY_REF_ID_REGEXP.test(first)) {
        // edge case: array with marker was passed to encoder and encoded as eg ["~$$id:0", 1, 2, 3]
        // let's escape it back, but do not treat it as referenced
        if (first.startsWith("~")) {
          input[0] = first.slice(1);
        } else {
          /**
           * Array is marked as being referenced by something else,
           * eg its ["$$id:0", 1, 2, 3]
           */
          const [, id] = MAYBE_ESCAPED_ARRAY_REF_ID_REGEXP.exec(first)!;
          context.registerRef(Number(id), result);
          input = input.slice(1);
        }
      }
    }

    // We are ready to process the array
    for (let index = 0; index < input.length; index++) {
      const inputToDecode = input[index];
      const decoded = decodeInput<any>(inputToDecode, context, coder, addNumberPathSegment(path, index));

      // tag was marked as being referenced by something else, eg { $$id: 0, $$set: [1, 2, 3] }
      if (getIsReferencedTag(inputToDecode)) {
        // register it so this other thing will be able to resolve its reference later by id
        context.registerRef(inputToDecode["$$id"], decoded);
      }

      result[index] = decoded;
    }

    return result as T;
  }

  // It is a record - it might be a few things dependong on its format:

  const keys = Object.keys(input);

  // It is a ref alias, eg { $$ref: 0 }, we need to replace it with the object it is referencing
  if (keys.length === 1 && typeof input.$$ref === "number") {
    return resolveRefAlias<T>(input as RefAlias, context, path);
  }

  /**
   * It is either a custom type tag, eg { $$set: [1, 2, 3] } or a plain JSON record.
   *
   * Both can be marked as being referenced by something else, eg
   * { $$id: 0, $$set: [1, 2, 3] }
   * { $$id: 0, foo: "bar" }
   */

  // Let's see if it is marked as being referenced by something else
  let refid: number | undefined = input["$$id"] as number | undefined;

  if (typeof refid !== "number") {
    refid = undefined;
  }

  // Let's see if it is matching a format of a custom type tag
  // refid is passed as optimization as we already know it, to make it easier to decide if input is matching
  // a custom type tag format
  const customTypeTag = getMaybeCustomTypeTag(refid, keys);

  if (customTypeTag) {
    // it is a custom type tag
    const result = resolveTypeTag<T>(input, customTypeTag, context, coder, path);

    // tag was marked as being referenced by something else, eg { $$id: 0, $$set: [1, 2, 3] }
    if (refid !== undefined) {
      // register it so this other thing will be able to resolve its reference later by id
      context.registerRef(refid, result as object);
    }

    return result;
  }

  // it is a plain JSON record

  // create a reference as quickly as possible, and register it if it is marked as being referenced by something else
  // this is needed in case some property of this very object is referencing itself (if so, it will need this
  // reference very soon)
  const result: Record<string, any> = {};

  if (refid !== undefined) {
    context.registerRef(refid, result as object);
  }

  for (const key of keys) {
    // "$$id" is a special marker not meant to be part of the result
    if (key === "$$id" || getIsForbiddenProperty(key)) continue;

    const inputValue = input[key];

    const decoded = decodeInput<any>(inputValue, context, coder, addPathSegment(path, key));

    // If the key was escpaed, use unescaped version for assigning data to the result
    result[getIsEscapedTagKey(key) ? key.slice(1) : key] = decoded;

    if (getIsReferencedTag(inputValue)) {
      context.registerRef(inputValue.$$id, decoded);
    }
  }

  return result as T;
}
