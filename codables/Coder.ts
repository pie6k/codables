import * as builtinTypesMap from "./builtin";

import { AnyCodableClass, JSONValue } from "./types";
import { CoderType, createCoderType, getIsCoderType } from "./CoderType";
import { EncodeContext, EncodeOptions } from "./EncodeContext";
import { getCodableClassType, getIsCodableClass } from "./codableClass";

import { DecodeContext } from "./DecodeContext";
import { copyJSON } from "./utils/json";
import { decodeInput } from "./decode";
import { encodeInput } from "./encode";

const DEFAULT_TYPES = [...Object.values(builtinTypesMap)].filter(
  getIsCoderType,
);

function createTypesMap(types: CoderType[]) {
  return new Map<string, CoderType>(types.map((type) => [type.name, type]));
}

export class Coder {
  private readonly typesMap = new Map<string, CoderType>();
  private readonly registeredClasses = new WeakSet<AnyCodableClass<any>>();

  constructor(extraTypes: CoderType[] = []) {
    this.typesMap = createTypesMap([...DEFAULT_TYPES, ...(extraTypes ?? [])]);
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
  }

  registerClass(...classes: AnyCodableClass<any>[]) {
    if (this.isDefault) {
      throw new Error(
        "Cannot register classes on the default coder. Create a custom coder instance using `new Coder()` and register classes on that instance.",
      );
    }

    for (const Class of classes) {
      const codableClassType = getCodableClassType(Class);
      if (!codableClassType) continue;

      if (this.registeredClasses.has(Class)) continue;

      this.registerType(codableClassType);
      this.registeredClasses.add(Class);
    }
  }

  register(...typesOrClasses: (AnyCodableClass<any> | CoderType<any, any>)[]) {
    for (const typeOrClass of typesOrClasses) {
      if (typeOrClass instanceof CoderType) {
        this.registerType(typeOrClass);
      } else if (getIsCodableClass(typeOrClass)) {
        this.registerClass(typeOrClass);
      } else {
        throw new Error(`Invalid type or class: ${typeOrClass}`);
      }
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
  ) {
    return this.registerType(createCoderType(name, canEncode, encode, decode));
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
