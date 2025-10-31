import {
  ARRAY_REF_ID_REGEXP,
  ESCAPED_ARRAY_REF_ID_REGEXP,
  RefAlias,
  Tag,
  TagKey,
  getIsEscapedTagKey,
  getIsReferencedTag,
  getIsTagKey,
} from "./format";

import { Coder } from "./Coder";
import { DecodeContext } from "./DecodeContext";
import { JSONValue } from "./types";
import { decodeMaybeSpecialString } from "./specialStrings";
import { getIsForbiddenProperty } from "./utils/security";

function resolveRefAlias<T>(input: RefAlias, context: DecodeContext): T {
  const referencedObject = context.resolveRefId(input.$$ref);

  if (!referencedObject) {
    context.warnOnce(`no-ref-${input.$$ref}`, `Reference could not be resolved while decoding (${input.$$ref})`);

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

function resolveTypeTag<T>(tag: Tag<JSONValue>, tagKey: TagKey, context: DecodeContext, coder: Coder): T {
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

  const payload = decodeInput(tag[tagKey], context, coder);

  const result = matchingType.decode(payload, context, tag.$$id ?? null) as T;

  if (getIsReferencedTag(tag)) {
    // We know it is an object, otherwise nothing would be able to reference it in the first place
    context.registerRef(tag.$$id, result as object);
  }

  return result;
}

function getMaybeCustomTypeTag(refId: number | undefined, keys: string[]) {
  // We determine conditions needed for a valid type tag
  // either { $$type: data }, or { $$id: 0, $$type: data }
  //
  // should be like { $$set: [1, 2, 3] } as we do not have $$id in the tag
  if (refId === undefined && keys.length !== 1) return false as const;
  // should be like { $$id: 0, $$set: [1, 2, 3] }
  if (refId !== undefined && keys.length !== 2) return false as const;

  if (keys.length === 1) {
    return getIsTagKey(keys[0]) ? keys[0] : (false as const);
  }

  /**
   * The first key is $$id. For it to be a tag, it must have 2nd key and it must match $$ syntax
   */
  if (keys[0] === "$$id") {
    return getIsTagKey(keys[1]) ? (keys[1] as TagKey) : (false as const);
  }

  if (keys[1] === "$$id") {
    return getIsTagKey(keys[0]) ? (keys[0] as TagKey) : (false as const);
  }

  return false as const;
}

export function decodeInput<T>(input: JSONValue, context: DecodeContext, coder: Coder): T {
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

    /**
     * Array is marked as being referenced by something else,
     * eg its ["$$id:0", 1, 2, 3]
     */
    if (typeof input[0] === "string" && ARRAY_REF_ID_REGEXP.test(input[0])) {
      const [, id] = ARRAY_REF_ID_REGEXP.exec(input[0])!;
      // lets register it so this other thing will be able to resolve it later by id
      context.registerRef(Number(id), result);

      // let's remove the $$id marker
      // todo: should we mutate instead with .splice? probably not
      input = input.slice(1);
    } else if (typeof input[0] === "string" && ESCAPED_ARRAY_REF_ID_REGEXP.test(input[0])) {
      // edge case: array with marker was passed to encoder and encoded as eg ["~$$id:0", 1, 2, 3]
      // let's escape it back, but do not treat it as referenced
      input[0] = input[0].slice(1);
    }

    // We are ready to process the array
    for (let index = 0; index < input.length; index++) {
      const inputToDecode = input[index];
      const decoded = decodeInput<any>(inputToDecode, context, coder);

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
    return resolveRefAlias<T>(input as RefAlias, context);
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
    const result = resolveTypeTag<T>(input, customTypeTag, context, coder);

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

    // If the key was escpaed, use unescaped version for assigning data to the result
    const decodeKey = getIsEscapedTagKey(key) ? key.slice(1) : key;

    const inputValue = input[key];

    const decoded = decodeInput<any>(inputValue, context, coder);

    result[decodeKey] = decoded;

    if (getIsReferencedTag(inputValue)) {
      context.registerRef(inputValue["$$id"], decoded);
    }
  }

  return result as T;
}
