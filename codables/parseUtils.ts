import { CUSTOM_TYPE_INDICATOR_PREFIX } from "./consts";
import { Coder } from "./Coder";
import { JSONValue } from "./types";
import { getIsRecord } from "./is";

function parseCustomTypeIndicatorKey(key: string) {
  if (!key.startsWith(CUSTOM_TYPE_INDICATOR_PREFIX)) {
    return null;
  }

  return key.slice(CUSTOM_TYPE_INDICATOR_PREFIX.length);
}

export function parseMaybeCustomTypeWrapper(input: unknown, coder: Coder) {
  if (!getIsRecord(input)) {
    return null;
  }

  const key = Object.keys(input);

  if (key.length !== 1) return null;

  const [customTypeIndicatorKey] = key;

  const customTypeName = parseCustomTypeIndicatorKey(customTypeIndicatorKey);

  if (!customTypeName) return null;

  const customType = coder.getTypeByName(customTypeName);

  if (!customType) return null;

  const data = input[customTypeIndicatorKey] as JSONValue;

  return {
    name: customTypeName,
    type: customType,
    data,
    coder,
  };
}

export type ParsedCustomTypeWrapper = NonNullable<
  ReturnType<typeof parseMaybeCustomTypeWrapper>
>;
