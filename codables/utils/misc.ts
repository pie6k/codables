import { Path, splitPath } from "./path";
import { getIsObject, getIsRecord } from "../is";

import { getIsTagKey } from "../format";

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

function getInSetAtIndex<T>(target: Set<T>, index: number): T {
  let i = 0;
  for (const item of target) {
    if (i === index) return item;
    i++;
  }

  throw new Error(`Index out of bounds: ${index}`);
}

enum EntryTarget {
  Key = 0,
  Value = 1,
}

function updateEntryInMap(map: Map<unknown, unknown>, index: number, target: EntryTarget, newValue: unknown) {
  const entries = [...map.entries()];

  if (index < 0 || index >= entries.length) throw new Error(`Index out of bounds: ${index}`);

  if (target === EntryTarget.Value) {
    const entry = entries[index];
    map.set(entry[0], newValue);
    return;
  }

  entries[index][EntryTarget.Key] = newValue;

  map.clear();
  for (const entry of entries) {
    map.set(entry[0], entry[1]);
  }
}

function getInMapByIndex(map: Map<unknown, unknown>, entryIndex: number, target: EntryTarget) {
  const entries = [...map.entries()];
  if (entryIndex < 0 || entryIndex >= entries.length) throw new Error(`Index out of bounds: ${entryIndex}`);

  return entries[entryIndex][target];
}

export function tryToSetInParent(parent: object, path: Path, value: unknown) {
  const segments = splitPath(path);

  let target = parent;

  while (segments.length > 1) {
    const segment = segments.shift()!;

    if (getIsTagKey(segment)) continue;

    if (target instanceof Set) {
      target = getInSetAtIndex(target, Number(segment));
      continue;
    }

    if (target instanceof Map) {
      let entryIndex = Number(segment);
      const entryTarget: EntryTarget = Number(segments.shift()!);
      const shouldSetNow = segments.length === 0;

      if (shouldSetNow) {
        updateEntryInMap(target, entryIndex, entryTarget, value);

        return;
      }

      target = getInMapByIndex(target, entryIndex, entryTarget) as object;
      continue;
    }

    target = target[segment as keyof typeof target] as object;
  }

  const lastSegment = segments.shift()!;

  if (target instanceof Set) {
    setInSetAtIndex(target, Number(lastSegment), value);
    return;
  }

  if (target instanceof Map) {
    throw new Error("Bad state: Map should be already processed");
  }

  Reflect.set(target, lastSegment, value);
}
