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
