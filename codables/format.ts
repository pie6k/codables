export type TagKey<T extends string = string> = `$$${T}`;

export type Tag<V = unknown, T extends string = string> = {
  [key in TagKey<T>]: V;
};

export type RefAlias = Tag<string, "ref">;

export function getTagValue<T>(tag: Tag<T>) {
  return Object.values(tag)[0];
}
