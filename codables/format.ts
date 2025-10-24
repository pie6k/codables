import { getIsRecord } from "./is";

export type TypeKey<T extends string = string> = `$$${T}`;

export type TypeWrapper<V = unknown, T extends string = string> = {
  [key in TypeKey<T>]: V;
};

export type RefAlias = TypeWrapper<string, "ref">;

export function getIsTypeKey(key: string, ofType?: string): key is TypeKey {
  if (!key.startsWith("$$")) return false;

  if (ofType === undefined) return true;

  return key.slice(2) === ofType;
}

export function getIsTypeWrapper<T extends string>(
  object: unknown,
  ofType?: T
): object is TypeWrapper<T> {
  if (!getIsRecord(object)) return false;

  const keys = Object.keys(object);

  if (keys.length !== 1) return false;

  const key = keys[0];

  if (ofType === undefined && key === "$$ref") return false;

  if (getIsTypeKey(key, ofType)) return true;

  return false;
}

export function getIsRefAlias(object: unknown): object is RefAlias {
  return getIsTypeWrapper(object, "ref");
}

export function getTypeWrapperTypeName(typeWrapper: TypeWrapper): string {
  const key = Object.keys(typeWrapper)[0];

  if (!getIsTypeKey(key))
    throw new Error(`Invalid type wrapper: ${JSON.stringify(typeWrapper)}`);

  return key.slice(2);
}
