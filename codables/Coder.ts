import * as builtinTypesMap from "./builtin";

import { AnyCodableClass, JSONValue } from "./types";
import { CoderType, createCoderType, getIsCoderType } from "./CoderType";
import { EncodeContext, EncodeOptions } from "./EncodeContext";
import { assert, assertGet } from "./utils/assert";
import { getCodableClassType, getIsCodableClass } from "./decorators/registry";

import { AnyClass } from "./decorators/types";
import { DecodeContext } from "./DecodeContext";
import { copyJSON } from "./utils/json";
import { decodeInput } from "./decode";
import { encodeInput } from "./encode";

const DEFAULT_TYPES = [...Object.values(builtinTypesMap)].filter(getIsCoderType);

function getSortedTypes(types: CoderType[]) {
  return types.sort((a, b) => {
    return b.priority - a.priority;
  });
}

function createTypesMap(types: CoderType[]) {
  const sortedTypes = getSortedTypes(types);

  const map = new Map<string, CoderType>();

  for (const type of sortedTypes) {
    if (map.has(type.name)) {
      throw new Error(`Coder type "${type.name}" already registered`);
    }

    map.set(type.name, type);
  }

  return map;
}

type CoderTypeOrClass = CoderType | AnyClass;

function resolveCoderTypeOrClass(typeOrClass: CoderTypeOrClass): CoderType {
  if (typeOrClass instanceof CoderType) {
    return typeOrClass;
  }

  const codableClassType = getCodableClassType(typeOrClass);

  if (!codableClassType) {
    throw new Error(`Codable class "${typeOrClass.name}" not registered`);
  }

  return codableClassType;
}

function updateTypesOrderByPriority(currentTypes: Map<string, CoderType>) {
  const sortedTypes = getSortedTypes([...currentTypes.values()]);

  const needsReordering = sortedTypes.some((type) => type.priority !== 0);

  if (!needsReordering) return;

  currentTypes.clear();

  for (const type of sortedTypes) {
    currentTypes.set(type.name, type);
  }
}

export class Coder {
  private readonly typesMap = new Map<string, CoderType>();
  private readonly registeredClasses = new WeakSet<AnyCodableClass<any>>();

  constructor(extraTypes: CoderTypeOrClass[] = []) {
    const resolvedExtraTypes = extraTypes.map(resolveCoderTypeOrClass);
    this.typesMap = createTypesMap([...DEFAULT_TYPES, ...resolvedExtraTypes]);
  }

  private reorderTypes() {
    updateTypesOrderByPriority(this.typesMap);
  }

  getTypeByName(name: string): CoderType | null {
    return this.typesMap.get(name) ?? null;
  }

  registerType(...types: Array<CoderType>) {
    if (this.isDefault) {
      throw new Error(
        "Cannot register types on the default coder. Create a custom coder instance using `new Coder()` and register types on that instance.",
      );
    }

    for (const type of types) {
      if (this.typesMap.has(type.name)) {
        throw new Error(`Coder type "${type.name}" already registered`);
      }

      this.typesMap.set(type.name, type);
    }

    this.reorderTypes();
  }

  register(...typesOrClasses: CoderTypeOrClass[]) {
    for (const typeOrClass of typesOrClasses) {
      if (getIsCodableClass(typeOrClass)) {
        if (this.registeredClasses.has(typeOrClass)) continue;
        const type = assertGet(getCodableClassType(typeOrClass), `Codable class "${typeOrClass.name}" not registered`);

        this.registerType(type);
        this.registeredClasses.add(typeOrClass);
        continue;
      }

      return this.registerType(typeOrClass);
    }
  }

  /**
   * Typescript-sugar over `.registerType()` with better type inference.
   */
  addType<Item, Data>(
    name: string,
    canEncode: (value: unknown) => value is Item,
    encode: (data: Item) => Data,
    decode: (data: Data) => Item,
    priority?: number,
  ) {
    return this.registerType(createCoderType(name, canEncode, encode, decode, priority));
  }

  encode<T>(value: T, options?: EncodeOptions): JSONValue {
    const encodeContext = new EncodeContext(options);

    return encodeInput(value, encodeContext, this, "/");
  }

  decode<T>(value: JSONValue): T {
    const context = new DecodeContext(value);

    if (context.isPlainJSON) return copyJSON(value) as T;

    return decodeInput<T>(value, context, this, "/");
  }

  stringify<T>(value: T): string {
    return JSON.stringify(this.encode(value));
  }

  parse<T>(value: string): T {
    return this.decode(JSON.parse(value));
  }

  copy<T>(value: T): T {
    return this.decode<T>(this.encode(value));
  }

  getMatchingTypeFor(input: unknown): CoderType | null {
    for (const type of this.typesMap.values()) {
      if (type.canHandle(input)) {
        return type;
      }
    }

    return null;
  }

  get isDefault() {
    return this === defaultCoder;
  }
}

export function createCoder(extraTypes: CoderType[] = []) {
  return new Coder(extraTypes);
}

export const defaultCoder = createCoder();

export function decode<T>(value: JSONValue): T {
  return defaultCoder.decode(value);
}

export function encode<T>(value: T): JSONValue {
  return defaultCoder.encode(value);
}

export function stringify<T>(value: T): string {
  return defaultCoder.stringify(value);
}

export function parse<T>(value: string): T {
  return defaultCoder.parse(value);
}

export function copy<T>(value: T): T {
  return defaultCoder.copy(value);
}
