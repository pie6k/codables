import { getIsRecord } from "./is";

export type TypeKey<T extends string = string> = `$$${T}`;
export type EscapedTypeKey = `\\$${string}`;

export type TypeWrapper<T extends string, V> = {
  [K in TypeKey<T>]: V;
};

export type EscapedTypeWrapper = {
  [K in EscapedTypeKey]: unknown;
};

const ESCAPED_TYPE_KEY_REGEX = /^\$\$/;
const TYPE_KEY_REGEX = /^\$\$/;

export type RefAlias = TypeWrapper<"refid", string>;

export function getIsTypeKey<T extends string>(
  key: string,
  ofType?: T
): key is TypeKey<T> {
  if (!key.startsWith("$$")) return false;

  if (ofType === undefined) return true;

  return key.slice(2) === ofType;
}

export function getIsEscapedTypeKey(key: string): key is EscapedTypeKey {
  return key.startsWith("\\$$");
}

export function escapeTypeKey<T extends string = string>(
  key: TypeKey<T>
): EscapedTypeKey {
  return `\\${key}`;
}

export function unescapeTypeKey<T extends string = string>(
  key: EscapedTypeKey
): TypeKey<T> {
  return key.slice(1) as TypeKey<T>;
}

export function getIsTypeWrapper<T extends string, V>(
  object: unknown,
  ofType?: T
): object is TypeWrapper<T, V> {
  if (!getIsRecord(object)) return false;

  for (const key of Object.keys(object)) {
    if (getIsTypeKey(key, ofType)) return true;
  }

  return false;
}

export function getIsRefAlias(object: unknown): object is RefAlias {
  return getIsTypeWrapper(object, "refid");
}

export function getIsEscapedTypeWrapper<T extends string, V>(
  object: unknown
): object is EscapedTypeWrapper {
  if (!getIsRecord(object)) return false;

  for (const key of Object.keys(object)) {
    if (getIsEscapedTypeKey(key)) return true;
  }

  return false;
}

export function unescapeTypeWrapper(
  object: EscapedTypeWrapper
): TypeWrapper<string, unknown> {
  const result: TypeWrapper<string, unknown> = {};

  for (const [key, value] of Object.entries(object)) {
    if (getIsEscapedTypeKey(key)) {
      result[unescapeTypeKey(key)] = value;
    } else {
      result[key as TypeKey<string>] = value;
    }
  }

  return result;
}

export function escapeTypeWrapper(
  object: TypeWrapper<string, unknown>
): EscapedTypeWrapper {
  const result: EscapedTypeWrapper = {};

  for (const [key, value] of Object.entries(object)) {
    if (getIsTypeKey(key)) {
      result[escapeTypeKey(key)] = value;
    } else {
      result[key as EscapedTypeKey] = value;
    }
  }

  return result;
}
