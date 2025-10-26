import { getIsRecord } from "./is";

export type TagKey<T extends string = string> = `$$${T}`;

export type Tag<V = unknown, T extends string = string> = [TagKey<T>, V];

export type RefAlias = Tag<string, "ref">;

export function getIsTagKey(key: string, ofType?: string): key is TagKey {
  if (!key.startsWith("$$")) return false;

  if (ofType === undefined) return true;

  return key.slice(2) === ofType;
}

export function getIsTag<T extends string>(
  object: unknown,
  ofType?: T
): object is Tag<T> {
  if (!Array.isArray(object)) return false;

  if (object.length !== 2) return false;

  if (ofType === undefined && object[1] === "$$ref") return false;

  if (getIsTagKey(object[0], ofType)) return true;

  return false;
}

export function getIsRefAlias(object: unknown): object is RefAlias {
  return getIsTag(object, "ref");
}

export function getTypeWrapperTypeName(typeWrapper: Tag): string {
  const key = Object.keys(typeWrapper)[0];

  if (!getIsTagKey(key))
    throw new Error(`Invalid type wrapper: ${JSON.stringify(typeWrapper)}`);

  return key.slice(2);
}
