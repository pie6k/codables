import * as builtinTypesMap from "./builtin";

import { AnyCodableClass, JSONValue } from "./types";
import { CoderType, createCoderType, getIsCoderType } from "./CoderType";
import { getCodableClassType, getIsCodableClass } from "./codableClass";

import { EncodeContext } from "./EncodeContext";
import { JSONPointer } from "./utils/JSONPointer";
import { decodeInput } from "./decode";
import { encodeInput } from "./encode";

const DEFAULT_TYPES = [...Object.values(builtinTypesMap)].filter(
  getIsCoderType
);

export class Coder {
  private typesMap = new Map<string, CoderType>(
    DEFAULT_TYPES.map((type) => [type.name, type])
  );
  private registeredClasses = new WeakSet<AnyCodableClass<any>>();

  getTypeByName(name: string): CoderType | null {
    return this.typesMap.get(name) ?? null;
  }

  registerType(...types: Array<CoderType>) {
    if (this.isDefault) {
      throw new Error(
        "Cannot register types on the default coder. Create a custom coder instance using `new Coder()` and register types on that instance."
      );
    }

    for (const type of types) {
      if (this.typesMap.has(type.name)) {
        throw new Error(`Coder type "${type.name}" already registered`);
      }

      this.typesMap.set(type.name, type);
    }
  }

  registerClass(...classes: Array<AnyCodableClass<any>>) {
    if (this.isDefault) {
      throw new Error(
        "Cannot register classes on the default coder. Create a custom coder instance using `new Coder()` and register classes on that instance."
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

  register(
    ...typesOrClasses: Array<AnyCodableClass<any> | CoderType<any, any>>
  ) {
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
    decode: (data: Data) => Item
  ) {
    return this.registerType(createCoderType(name, canEncode, encode, decode));
  }

  encode<T>(value: T): JSONValue {
    const encodeContext = new EncodeContext();

    return encodeInput(value, encodeContext, this, []);
  }

  decode<T>(value: JSONValue): T {
    const objectsMap = new Map<string, object>();

    return decodeInput<T>(value, objectsMap, this, []);
  }

  stringify<T>(value: T): string {
    return JSON.stringify(this.encode(value));
  }

  parse<T>(value: string): T {
    return this.decode(JSON.parse(value));
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
    return this === coder;
  }
}

export const coder = new Coder();

export function decode<T>(value: JSONValue): T {
  return coder.decode(value);
}

export function encode<T>(value: T): JSONValue {
  return coder.encode(value);
}

export function stringify<T>(value: T): string {
  return coder.stringify(value);
}

export function parse<T>(value: string): T {
  return coder.parse(value);
}
