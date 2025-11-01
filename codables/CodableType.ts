import { Tag, TagKey } from "./format";

import { AnyClass } from "./types";
import { CodableDependencies } from "./dependencies";
import { DecodeContext } from "./DecodeContext";
import { EncodeContext } from "./EncodeContext";

interface ReaderHandler<T> {
  get: () => T;
  set: (value: T) => boolean;
}

/**
 * A bit special, optional option of custom codable types you will most likely never need to provide.
 *
 * Sometimes, Codables needs to update some value inside of the decoded object after it was created.
 *
 * It happens in case of circular references, eg. when some object references itself.
 *
 * If this is the case, it is impossible to create the object in a single line of code, because it would
 * need to look like `const foo = new Set([foo])` (`foo` is used before it is ready)
 *
 * You will need instead:
 * const foo = new Set();
 * foo.add(foo);
 *
 * Thus, reader takes instance and UpdateRequest (which allows you to read 'input' path of some data we want to update or read)
 * and it has to return { get, set } functions that will read or write to the actual object.
 *
 * For example, in case of `$$Set`, if it is called with path like /2 (["2"]), it means we either want to get or change the 3rd item of the set.
 *
 * The most complext case is `$$Map`, so will give it as an example.
 *
 * Maps encode its input as an array of entries, eg [["foo", 1], ["bar", 2]].
 *
 * Thus path to set or get something inside the map is a set of 2 numbers.
 * - the first = index of the map entry
 * - the second = 0 if we want to get or set the key, 1 if we want to get or set the value
 *
 * eg if we have a map like `const map = new Map([["foo", 1], ["bar", 2]])`,
 * and we want to change /1/1 to `3` it means we want to change 2nd entry ("bar") value to `3`
 * like `map.set("bar", 3)`
 *
 * reader: (map, request) => {
 *   // index of the entry path points to
 *   const entryIndex = Number(request.getNextPathSegment());
 *   // 0 if path points to key, 1 if path points to value
 *   const keyOrValue: EntryTarget = Number(request.getNextPathSegment());
 *
 *   if (isNaN(entryIndex)) throw new Error("Expected number for entry index, got NaN");
 *   if (isNaN(keyOrValue)) throw new Error("Expected number for entry target, got NaN");
 *
 *   // path points to key - we either want to get or set the key
 *   if (keyOrValue === 0) {
 *     return {
 *       get: () => getMapKeyByIndex(map, entryIndex),
 *       set: (newKey) => updateMapKeyByIndex(map, entryIndex, newKey),
 *     };
 *   }
 *
 *   // path points to value - we either want to get or set the value
 *   if (keyOrValue === 1) {
 *     return {
 *       get: () => getMapValueByIndex(map, entryIndex),
 *       set: (newValue) => updateMapValueByIndex(map, entryIndex, newValue),
 *     };
 *   }
 *
 *   throw new Error(`Entry path should be either 0 or 1, got ${keyOrValue}`);
 * }
 *
 * ----------------
 *
 * By default, reading and writing is way simpler,
 * eg if input is { foo: "bar"}, and the object is { foo: "bar" },
 * to change path /foo to "baz", you can just do: object["foo"] = "baz"
 *
 * which is what will happen by default.
 */
export type CodableReader<T> = (item: T, segments: IterableIterator<string>) => ReaderHandler<unknown>;

export interface CodableTypeOptions<Item> {
  priority?: number;
  dependencies?: CodableDependencies;
  isFlat?: boolean;
  /**
   * If provided, will allow Coder instance to faster find it in the registry for some input
   */
  Class?: AnyClass | AnyClass[];
  reader?: CodableReader<Item>;
}

export const defaultCodableReader: CodableReader<any> = (item, segments) => {
  const [key] = segments;

  return {
    get: () => Reflect.get(item, key),
    set: (value) => Reflect.set(item, key, value),
  };
};

interface CodableTypeDefinition<Item, Data> {
  name: string;
  canHandle: (value: unknown) => value is Item;
  encode: (data: Item, context: EncodeContext) => Data;
  decode: (data: Data, context: DecodeContext, referenceId: number | null) => Item;
  options?: CodableTypeOptions<Item>;
}

export function createTag<Name extends string, Data>(name: Name, data: Data) {
  return {
    [`$$${name}`]: data,
  } as Tag<Data, Name>;
}

/**
 * Custom class types have priority = amount of classes they extend. This is to ensure that child classes are checked first.
 * However, we still want built-in types, like `Map`, to be checked before those as they are certainly more common.
 *
 * If it is 0, custom class types would always be checked before built-in types, degrading performance.
 */
const DEFAULT_PRIORITY = 10;

export class CodableType<Item = any, Data = any> {
  constructor(readonly definition: CodableTypeDefinition<Item, Data>) {
    this.name = definition.name;
    this.tagKey = `$$${this.name}`;
    this.priority = definition.options?.priority ?? DEFAULT_PRIORITY;
    this.dependencies = definition.options?.dependencies ?? null;
    this.isFlat = definition.options?.isFlat ?? false;
    this.reader = definition.options?.reader ?? defaultCodableReader;

    if (definition.options?.Class) {
      const classOrClasses = definition.options.Class;

      if (Array.isArray(classOrClasses)) {
        this.classes = classOrClasses;
      } else {
        this.classes = [classOrClasses];
      }
    }
  }

  readonly name: string;
  readonly priority: number;
  readonly dependencies: CodableDependencies | null;
  readonly isFlat: boolean;
  readonly classes: AnyClass[] | undefined;

  readonly tagKey: TagKey<typeof this.name>;

  readonly reader: CodableReader<Item>;

  encode(original: Item, context: EncodeContext): Data {
    return this.definition.encode(original, context);
  }

  encodeTag(original: Item, context: EncodeContext): Tag<Data, typeof this.name> {
    return createTag(this.name, this.encode(original, context));
  }

  decode(data: Data, context: DecodeContext, referenceId: number | null): Item {
    return this.definition.decode(data, context, referenceId);
  }

  canHandle(original: unknown): original is Item {
    return this.definition.canHandle(original);
  }

  createTag(data: Data): Tag<Data, typeof this.name> {
    return createTag(this.name, data);
  }
}

export function codableType<Item, Data>(
  name: string,
  canHandle: (value: unknown) => value is Item,
  encode: (data: Item, context: EncodeContext) => Data,
  decode: (data: Data, context: DecodeContext, referenceId: number | null) => Item,
  options?: CodableTypeOptions<Item>,
): CodableType<Item, Data> {
  return new CodableType({
    name,
    canHandle,
    encode,
    decode,
    options,
  });
}

export function getIsCodableType(value: unknown): value is CodableType {
  return value instanceof CodableType;
}
