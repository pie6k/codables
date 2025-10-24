import { addPathSegment, unescapePathSegment } from "./utils/paths";
import {
  assertNotForbiddenProperty,
  getIsForbiddenProperty,
} from "./utils/security";
import { getIsEscapedTypeKey, unescapeTypeKey } from "./format";
import { getIsJSONPrimitive, getIsObject } from "./is";
import { getIsNestedJSON, iterateNestedJSON } from "./utils";

import { Coder } from "./Coder";
import { JSONValue } from "./types";
import { getIsRefAlias } from "./refs";

type ObjectsMap = Map<string, object>;

export function decodeInput<T>(
  input: JSONValue,
  objectsMap: ObjectsMap,
  coder: Coder,
  path: string
): T {
  if (getIsJSONPrimitive(input)) {
    return input as T;
  }

  const maybeCustomTypeWrapper = coder.parseMaybeCustomTypeWrapper(input);

  if (maybeCustomTypeWrapper) {
    const decodedData = decodeInput(
      maybeCustomTypeWrapper.data,
      objectsMap,
      coder,
      addPathSegment(path, maybeCustomTypeWrapper.type.wrapperKey)
    );

    const decoded = maybeCustomTypeWrapper.type.decoder(decodedData) as T;

    if (getIsObject(decoded)) {
      objectsMap.set(path, decoded);
    }

    return decoded;
  }

  if (getIsRefAlias(input)) {
    const refPath = input.$$ref;
    const source = objectsMap.get(refPath);

    if (!source) {
      throw new Error(`Source not found for ref path: ${refPath}`);
    }

    return source as T;
  }

  if (getIsNestedJSON(input)) {
    const result: any = Array.isArray(input) ? [] : {};

    objectsMap.set(path, result);

    for (let [key, value] of iterateNestedJSON(input)) {
      key = unescapePathSegment(key);
      if (getIsEscapedTypeKey(key)) {
        key = unescapeTypeKey(key);
      }

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

  // TODO: Something incorrect here?
  return input as T;
}
