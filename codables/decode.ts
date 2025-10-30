import { DecodableTypeOf, getDecodableTypeOf } from "./utils/typeof";
import { JSONArray, JSONValue } from "./types";
import { RefAlias, Tag, TagKey } from "./format";
import { addNumberPathSegment, addPathSegment } from "./utils/JSONPointer";

import { Coder } from "./Coder";
import { DecodeContext } from "./DecodeContext";
import { getIsForbiddenProperty } from "./utils/security";
import { getIsObject } from "./is";
import { narrowType } from "./utils/assert";

function resolveRefAlias<T>(input: RefAlias, context: DecodeContext, currentPath: string): T {
  const referencedObject = context.resolveRefAlias(input.$$ref);

  if (!referencedObject) {
    console.warn(`Reference could not be resolved while decoding (${input.$$ref}) at ${currentPath}`);
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

function resolveTypeTag<T>(
  tag: Tag<JSONValue>, // eg { $$set: [1, 2, 3] }
  tagKey: TagKey, // eg "$$set"
  context: DecodeContext,
  coder: Coder,
  path: string,
): T {
  const typeName = tagKey.slice(2); // eg "$$set" -> "set"

  const matchingType = coder.getTypeByName(typeName);

  if (!matchingType) {
    console.warn(`Unknown custom type: ${typeName} at ${path}. Returning the raw value.`);
    return tag[tagKey] as T;
  }

  /**
   * Decode data is present at eg input["$$set"], but it might contain some nested data that
   * needs to be decoded first.
   */
  const decodedTypeInput = decodeInput(tag[tagKey], context, coder, addPathSegment(path, tagKey));

  return matchingType.decode(decodedTypeInput, context) as T;
}

function decodeArray<T>(input: any[], context: DecodeContext, coder: Coder, path: string): T {
  const result: any[] = [];

  context.registerRef(path, result);

  for (let index = 0; index < input.length; index++) {
    const fullPath = addNumberPathSegment(path, index);

    const decoded = decodeInput<any>(input[index], context, coder, fullPath);

    result[index] = decoded;

    if (context.hasRefAliases && getIsObject(decoded)) {
      context.registerRef(fullPath, decoded);
    }
  }

  return result as T;
}

function decodeRecord<T>(input: Record<string, any>, context: DecodeContext, coder: Coder, path: string): T {
  const result: Record<string, any> = {};

  context.registerRef(path, result);

  for (const key of Object.keys(input)) {
    if (getIsForbiddenProperty(key)) continue;

    const fullPath = addPathSegment(path, key);

    const decoded = decodeInput<any>(input[key], context, coder, fullPath);

    result[key] = decoded;

    if (context.hasRefAliases && getIsObject(decoded)) {
      context.registerRef(fullPath, decoded);
    }
  }

  return result as T;
}

function unescapeTag(input: Tag) {
  const key = Object.keys(input)[0] as keyof typeof input;
  return {
    [key.slice(1)]: input[key],
  };
}

export function decodeInput<T>(input: JSONValue, context: DecodeContext, coder: Coder, path: string): T {
  let decodableTypeOf: DecodableTypeOf = getDecodableTypeOf(input, context);

  switch (decodableTypeOf) {
    case "escaped-tag": {
      input = unescapeTag(input as Tag) as Tag<JSONValue>;
      decodableTypeOf = "record"; // Even tho it will look now like a tag, we want it to be treated as an array and not parsed as a custom type
    }

    case "primitive": {
      return input as T;
    }

    case "ref-tag": {
      return resolveRefAlias<T>(input as RefAlias, context, path);
    }

    case "array": {
      return decodeArray<T>(input as any[], context, coder, path);
    }

    case "record": {
      return decodeRecord<T>(input as Record<string, any>, context, coder, path);
    }
  }

  narrowType<Tag<JSONValue>>(input);

  return resolveTypeTag<T>(input, decodableTypeOf, context, coder, path);
}
