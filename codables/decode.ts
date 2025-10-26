import { DecodableTypeOf, getDecodableTypeOf } from "./utils/typeof";
import { JSONArray, JSONObject, JSONValue } from "./types";
import { RefAlias, Tag } from "./format";

import { Coder } from "./Coder";
import { DecodeContext } from "./DecodeContext";
import { addPathSegment } from "./utils/JSONPointer";
import { getIsForbiddenProperty } from "./utils/security";
import { getIsObject } from "./is";
import { narrowType } from "./utils/assert";

export function decodeInput<T>(
  input: JSONValue,
  context: DecodeContext,
  coder: Coder,
  path: string,
): T {
  let decodableTypeOf: DecodableTypeOf = getDecodableTypeOf(input, context);

  switch (decodableTypeOf) {
    case "escaped-tag": {
      narrowType<Tag>(input);
      input = [`${input[0].slice(1)}`, input[1]] as JSONArray;
      decodableTypeOf = "array"; // Even tho it will look now like a tag, we want it to be treated as an array and not parsed as a custom type
    }
    case "primitive": {
      return input as T;
    }
    case "ref-tag": {
      narrowType<RefAlias>(input);

      const source = context.resolveRefAlias(input[1]);

      if (!source) {
        console.warn(
          `Reference could not be resolved while decoding (${input[1]}) at ${path}`,
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
    case "type-tag": {
      narrowType<Tag<JSONValue>>(input);

      const typeName = input[0].slice(2); // eg "$$set" -> "set"

      const matchingType = coder.getTypeByName(typeName);

      if (!matchingType) {
        console.warn(
          `Unknown custom type: ${typeName} at ${path}. Returning the raw value.`,
        );
        return input[1] as T;
      }

      /**
       * Decode data is present at eg input["$$set"], but it might contain some nested data that
       * needs to be decoded first.
       */
      const decodedTypeInput = decodeInput(
        input[1],
        context,
        coder,
        addPathSegment(path, 1),
      );

      return matchingType.decode(decodedTypeInput) as T;
    }
    case "array": {
      narrowType<JSONArray>(input);

      const result: any[] = [];

      context.registerRef(path, result);

      for (let key = 0; key < input.length; key++) {
        const fullPath = addPathSegment(path, key);

        const decoded = decodeInput<any>(input[key], context, coder, fullPath);

        result[key] = decoded;

        if (context.hasRefAliases && getIsObject(decoded)) {
          context.registerRef(fullPath, decoded);
        }
      }

      return result as T;
    }
    case "record": {
      narrowType<JSONObject>(input);

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
  }

  return null as T;
}
