import * as builtinTypesMap from "./builtin";

import { AnyCodableClass, JSONValue } from "./types";
import { CodableType, CodableTypeOptions, createCodableType, getIsCodableType } from "./CodableType";
import { DecodeContext, DecodeOptions } from "./DecodeContext";
import { EncodeContext, EncodeOptions } from "./EncodeContext";
import { assert, assertGet } from "./utils/assert";
import { getCodableClassType, getIsCodableClass } from "./decorators/registry";

import { $$externalReference } from "./ExternalReference";
import { AnyClass } from "./decorators/types";
import { copyJSON } from "./utils/json";
import { decodeInput } from "./decode";
import { performEncode } from "./encode";
import { resolveCodableDependencies } from "./dependencies";

const DEFAULT_TYPES = [...Object.values(builtinTypesMap), $$externalReference].filter(getIsCodableType);

function getSortedTypes(types: CodableType[]) {
  return types.sort((a, b) => {
    return b.priority - a.priority;
  });
}

function createTypesMap(types: CodableType[]) {
  const sortedTypes = getSortedTypes(types);

  const map = new Map<string, CodableType>();

  for (const type of sortedTypes) {
    if (map.has(type.name)) {
      throw new Error(`Coder type "${type.name}" already registered`);
    }

    map.set(type.name, type);
  }

  return map;
}

type CodableTypeOrClass = CodableType | AnyClass;

function resolveCodableTypeOrClass(typeOrClass: CodableTypeOrClass): CodableType {
  if (typeOrClass instanceof CodableType) {
    return typeOrClass;
  }

  const codableClassType = getCodableClassType(typeOrClass);

  if (!codableClassType) {
    throw new Error(`Codable class "${typeOrClass.name}" not registered`);
  }

  return codableClassType;
}

function updateTypesOrderByPriority(currentTypes: Map<string, CodableType>) {
  const sortedTypes = getSortedTypes([...currentTypes.values()]);

  const needsReordering = sortedTypes.some((type) => type.priority !== 0);

  if (!needsReordering) return;

  currentTypes.clear();

  for (const type of sortedTypes) {
    currentTypes.set(type.name, type);
  }
}

export class Coder {
  private readonly typesMap = new Map<string, CodableType>();

  constructor(extraTypes: CodableTypeOrClass[] = []) {
    this.typesMap = createTypesMap([...DEFAULT_TYPES]);

    this.register(...extraTypes);
  }

  private reorderTypes() {
    updateTypesOrderByPriority(this.typesMap);
  }

  getTypeByName(name: string): CodableType | null {
    return this.typesMap.get(name) ?? null;
  }

  private getHasType(type: CodableType): boolean {
    const existingType = this.getTypeByName(type.name);

    return type === existingType;
  }

  private registerSingleType(type: CodableType) {
    if (this.isDefault) {
      throw new Error(
        "Cannot register types on the default coder. Create a custom coder instance using `new Coder()` and register types on that instance.",
      );
    }

    if (this.getHasType(type)) return;

    if (this.typesMap.has(type.name)) {
      throw new Error(`Other codable type with name "${type.name}" already registered`);
    }

    this.typesMap.set(type.name, type);

    const dependencies = resolveCodableDependencies(type);

    for (const dependency of dependencies) {
      this.registerSingleType(dependency);
    }

    this.reorderTypes();
  }

  registerType(...types: Array<CodableType>) {
    for (const type of types) {
      this.registerSingleType(type);
    }
  }

  private registerSingle(typeOrClass: CodableTypeOrClass) {
    const typeToAdd = getIsCodableClass(typeOrClass)
      ? assertGet(getCodableClassType(typeOrClass), `Codable class "${typeOrClass.name}" not registered`)
      : typeOrClass;

    return this.registerSingleType(typeToAdd);
  }

  register(...typesOrClasses: CodableTypeOrClass[]) {
    for (const typeOrClass of typesOrClasses) {
      this.registerSingle(typeOrClass);
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
    options?: CodableTypeOptions,
  ) {
    return this.registerType(createCodableType(name, canEncode, encode, decode, options));
  }

  encode<T>(value: T, options?: EncodeOptions): JSONValue {
    const encodeContext = new EncodeContext(options);

    return performEncode(value, encodeContext, this, "/");
  }

  decode<T>(value: JSONValue, options?: DecodeOptions): T {
    const context = new DecodeContext(value, options);

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

  getMatchingTypeFor(input: unknown): CodableType | null {
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

export function createCoder(extraTypes: CodableType[] = []) {
  return new Coder(extraTypes);
}

export const defaultCoder = createCoder();

export function decode<T>(value: JSONValue, options?: DecodeOptions): T {
  return defaultCoder.decode(value, options);
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
