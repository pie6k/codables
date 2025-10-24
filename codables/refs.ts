import { getIsRecord } from "./is";

export type CircularRefAlias = {
  $$ref: string; // path to the source
};

export function createCircularRefAlias(path: string): CircularRefAlias {
  return {
    $$ref: path,
  };
}

export function getIsRefAlias(input: unknown): input is CircularRefAlias {
  return (
    getIsRecord(input) &&
    Object.keys(input).length === 1 &&
    Object.keys(input)[0] === "$$ref"
  );
}

export class CircularRefsManager {
  private refFirstSeenPath = new WeakMap<object, string>();

  handleTraversedObject(object: object, path: string) {
    if (this.refFirstSeenPath.has(object)) return;

    this.refFirstSeenPath.set(object, path);
  }

  getAlreadySeenObjectPath(object: object): string | null {
    return this.refFirstSeenPath.get(object) ?? null;
  }
}
