import { AnyCodableClass, AutoCodableClass } from "./types";
import { CoderType, createCoderType } from "./CoderType";

import { Thunk } from "./utils/misc";
import { assertGet } from "./utils/assert";
import { detectCodableProperties } from "./utils/properties";

type WithMetadata<T> = T & { [Symbol.metadata]?: DecoratorMetadata };

const CODABLE_METADATA = Symbol.for("CODABLE_METADATA");

type CodableFieldsMap = Map<string, any>;
interface CodableClassMetadata {
  fields: CodableFieldsMap;
  name?: string;
  type?: CoderType<any, any>;
}

if (!Symbol.metadata) {
  Reflect.set(Symbol, "metadata", Symbol.for("Symbol.metadata"));
}

function getMetadata<T extends object>(Class: T): DecoratorMetadata | null {
  return (Class as WithMetadata<T>)[Symbol.metadata] ?? null;
}

function initCodableMetadata(metadata: DecoratorMetadata) {
  if (metadata[CODABLE_METADATA])
    return metadata[CODABLE_METADATA] as CodableClassMetadata;

  metadata[CODABLE_METADATA] = {
    name: undefined,
    fields: new Map(),
    type: undefined,
  };

  return metadata[CODABLE_METADATA] as CodableClassMetadata;
}

function getCodableMetadata<T extends object>(
  Class: T
): CodableClassMetadata | null {
  const codableMetadata = getMetadata(Class)?.[CODABLE_METADATA] ?? null;

  return codableMetadata as CodableClassMetadata | null;
}

export function getIsCodableClass<T extends AnyCodableClass<any>>(
  Class: T
): boolean {
  return getCodableMetadata(Class) !== null;
}

export function getCodableClassType<T extends AnyCodableClass<any>>(
  Class: T
): CoderType<any, any> | null {
  return getCodableMetadata(Class)?.type ?? null;
}

function serializeCodableClass<T extends object>(
  instance: T,
  fields: CodableFieldsMap
): Record<string, any> {
  const result: Record<string, any> = {};
  const fieldEntries = [...fields.entries()];

  // We have explicit fields to serialize
  if (fieldEntries.length > 0) {
    for (const [key, value] of fieldEntries) {
      result[key] = (instance as any)[key];
    }

    return result;
  }

  // Get all the properties of the instance

  for (const property of detectCodableProperties(instance)) {
    result[property] = (instance as any)[property];
  }

  return result;
}

function deserializeCodableClass<T extends AutoCodableClass<any>>(
  Class: T,
  data: Record<string, any>
): InstanceType<T> {
  const instance = new Class();

  for (const [key, value] of Object.entries(data)) {
    instance[key] = value;
  }

  return instance;
}

function createCodableClassType<T extends AnyCodableClass<any>>(
  Class: T,
  name: string,
  fields: CodableFieldsMap
): CoderType<any, any> {
  return createCoderType(
    Class.name,
    (value): value is T => value instanceof Class,
    (value) => serializeCodableClass(value, fields),
    (value) => deserializeCodableClass(Class as AutoCodableClass<any>, value)
  );
}

interface CodableClassOptions<T extends AnyCodableClass<any>> {
  dependencies?: Thunk<AnyCodableClass<any>[]>;
}

export function codableClass<T extends AnyCodableClass<any>>(
  name: string,
  options?: CodableClassOptions<T>
) {
  return (Class: T, context: ClassDecoratorContext<T>) => {
    const codableMetadata = initCodableMetadata(context.metadata);

    codableMetadata.name = name;
    codableMetadata.type = createCodableClassType(
      Class,
      name,
      codableMetadata.fields
    );
  };
}

type CodableFieldDecoratorContext<T, V> =
  | ClassFieldDecoratorContext<T, V>
  | ClassAccessorDecoratorContext<T, V>;

export function codable<T, V>() {
  return function codable<T, V>(
    initialValue: any,
    context: CodableFieldDecoratorContext<T, V>
  ) {
    const isSymbolName = typeof context.name === "symbol";

    if (isSymbolName)
      throw new Error("Symbol property names are not supported");

    const codableMetadata = initCodableMetadata(context.metadata);

    codableMetadata.fields.set(context.name, initialValue);
  };
}
