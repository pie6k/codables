import { JSONValue } from "./types";
import { getIsRecord } from "./is";

const MAYBE_ESCAPED_TYPE_KEY_REGEXP = /^~*\$\$/;

export function maybeEscapeTypeWrapper(input: unknown) {
  if (!getIsRecord(input)) return input;

  const entries = Object.entries(input);

  if (entries.length !== 1) return input;

  const [key, value] = entries[0];

  if (!MAYBE_ESCAPED_TYPE_KEY_REGEXP.test(key)) {
    return input;
  }

  return {
    [`~${key}`]: value,
  };
}

const ESCAPED_TYPE_KEY_REGEXP = /^~+\$\$/;

export function getIsEscapedWrapperKey(key: string): boolean {
  return ESCAPED_TYPE_KEY_REGEXP.test(key);
}

export function maybeUnescapeInput(input: JSONValue): JSONValue {
  if (!getIsRecord(input)) return input;

  const entries = Object.entries(input);

  if (entries.length !== 1) return input;

  const [key, value] = entries[0];

  if (!ESCAPED_TYPE_KEY_REGEXP.test(key)) return input;

  const unescapedKey = key.slice(1);

  return { [unescapedKey]: value } as JSONValue;
}
