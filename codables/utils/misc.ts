import { getIsObject, getIsRecord } from "../is";

export type Thunk<T> = T | (() => Thunk<T>);

export function resolveThunk<T>(thunk: Thunk<T>): T {
  let result = thunk;

  while (typeof result === "function") {
    result = (result as () => Thunk<T>)();
  }

  return result;
}

export function getSymbolKey(symbol: symbol): string {
  const nativeKey = Symbol.keyFor(symbol);
  if (nativeKey) return nativeKey;

  const toStringResult = symbol.toString(); // eg "Symbol(foo)"
  return toStringResult.slice(7, -1); // "foo"
}

export function removeUndefinedProperties<T extends Record<string, unknown>>(input: T): T {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(input)) {
    const value = input[key as keyof T];
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}

let i = 0;

const objectId = new WeakMap<object, number>();

export function getObjectId(object: object): number {
  if (!getIsObject(object)) return -1;

  if (objectId.has(object)) {
    return objectId.get(object)!;
  }

  const id = i++;
  objectId.set(object, id);
  return id;
}

function setInSetAtIndex(set: Set<unknown>, index: number, value: unknown) {
  const array = Array.from(set);
  array[index] = value;

  set.clear();
  for (const item of array) {
    set.add(item);
  }
}

export function tryToSetInParent(parent: object, keyInParent: string | number, value: unknown) {
  if (Array.isArray(parent)) {
    parent[keyInParent as number] = value;

    return true;
  }

  if (parent instanceof Map) {
    parent.set(keyInParent, value);
    return true;
  }

  if (parent instanceof Set) {
    setInSetAtIndex(parent, keyInParent as number, value);
    return true;
  }

  if (getIsRecord(parent)) {
    parent[keyInParent as string] = value;
    return true;
  }

  return false;
}
