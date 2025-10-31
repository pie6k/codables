import { JSONValue } from "./types";

export type TagKey<T extends string = string> = `$$${T}`;

export function getIsTagKey(key: string): key is TagKey {
  if (!key) return false;

  return key.startsWith("$$") && key.length > 2;
}

export function getIsReferencedTag(input: JSONValue): input is Required<RefIdTag> {
  return typeof input === "object" && input !== null && typeof (input as any)["$$id"] === "number";
}

type RefIdTag = {
  $$id?: number;
};

type RefIdArray = ["$$id", number, ...JSONValue[]];

export type Tag<V = unknown, T extends string = string> = RefIdTag & {
  [key in TagKey<T>]: V;
};

export type RefAlias = Tag<number, "ref">;

export function getTagValue<T>(tag: Tag<T>) {
  return Object.values(tag)[0];
}

/**
 * It is either our tag with $$ or already escaped tag (~$$) which we will escape further.
 * This is very rare case:
 * - someone encoded data that already looks like our internal format
 * - someone encoded data, and then encoded encoded data again instead of decoding it
 */
export function getIsMaybeEscapedTagKey(key: string) {
  return /^~*\$\$/.test(key);
}

export function getIsEscapedTagKey(key: string) {
  return /^~+\$\$.+/.test(key);
}

export const MAYBE_ESCAPED_ARRAY_REF_ID_REGEXP = /^\~*\$\$id:(\d+)$/;
export const ARRAY_REF_ID_REGEXP = /^\$\$id:(\d+)$/;
export const ESCAPED_ARRAY_REF_ID_REGEXP = /^\~+\$\$id:(\d+)$/;
