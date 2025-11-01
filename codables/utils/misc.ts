import { Path, splitPath } from "./path";
import { getIsCodableClass, getIsCodableClassInstance } from "../decorators/registry";
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

export function consumeArray<T>(source: T[], ignoreIf: (value: T) => boolean) {
  return {
    next() {
      while (true) {
        const segment = source.shift()!;

        if (ignoreIf && ignoreIf(segment)) {
          continue;
        }

        return {
          value: segment,
          done: false,
        };
      }
    },
    get isDone() {
      return source.length === 0;
    },
    [Symbol.iterator]() {
      return this;
    },
  } satisfies IterableIterator<T> & { readonly isDone: boolean };
}
