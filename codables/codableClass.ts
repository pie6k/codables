import { AnyCodableClass, AutoCodableClass } from "./types";
import { CoderType, createCoderType } from "./CoderType";

import { PrivateMetadata } from "./utils/metadata";
import { Thunk } from "./utils/misc";
import { detectCodableProperties } from "./utils/properties";

type WithMetadata<T> = T & { [Symbol.metadata]?: DecoratorMetadata };

const metadata = new PrivateMetadata<CodableClassMetadata>(() => ({
  fields: new Map(),
}));

type CodableFieldsMap = Map<string, any>;
interface CodableClassMetadata {
  fields: CodableFieldsMap;
  name?: string;
  type?: CoderType<any, any>;
}

export function getCodableMetadata<T extends object>(
  Class: T
): CodableClassMetadata | null {
  return metadata.getFor(Class);
}

export function getIsCodableClass<T extends AnyCodableClass<any>>(
  Class: T
): boolean {
  return metadata.isInitialized(Class);
}

export function getCodableClassType<T extends AnyCodableClass<any>>(
  Class: T
): CoderType<any, any> | null {
  return metadata.getFor(Class).type ?? null;
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
    name,
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
    const codableMetadata = metadata.init(context.metadata);

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

    const codableMetadata = metadata.init(context.metadata);

    codableMetadata.fields.set(context.name, initialValue);
  };
}
