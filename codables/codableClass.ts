import { CoderType, createCoderType } from "./CoderType";

import { AnyCodableClass } from "./types";

const IS_CODABLE = Symbol.for("IS_CODABLE");
const CODABLE_CLASS_TYPE = Symbol.for("CODABLE_CLASS_TYPE");

interface CodableClassMetadata {
  [IS_CODABLE]: boolean;
  [CODABLE_CLASS_TYPE]: CoderType<any, any>;
}

if (!Symbol.metadata) {
  Reflect.set(Symbol, "metadata", Symbol.for("Symbol.metadata"));
}

function getMetadata<T extends object>(Class: T): CodableClassMetadata | null {
  return (
    (Reflect.get(Class, Symbol.metadata) as CodableClassMetadata | null) ?? null
  );
}

export function getIsCodableClass<T extends AnyCodableClass<any>>(
  Class: T
): boolean {
  return getMetadata(Class)?.[IS_CODABLE] ?? false;
}

export function getCodableClassType<T extends AnyCodableClass<any>>(
  Class: T
): CoderType<any, any> | null {
  return getMetadata(Class)?.[CODABLE_CLASS_TYPE] ?? null;
}

export function createCodableClassType<T extends AnyCodableClass<any>>(
  Class: T
): CoderType<any, any> {
  return createCoderType(
    Class.name,
    (value): value is T => value instanceof Class,
    (value) => value,
    (value) => value
  );
}
export function codableClass<T extends AnyCodableClass<any>>(name: string) {
  return (Class: T, context: ClassDecoratorContext<T>) => {
    context.metadata[IS_CODABLE] = true;

    const codableClassType = createCodableClassType(Class);

    context.metadata[CODABLE_CLASS_TYPE] = codableClassType;
  };
}

type CodableFieldDecoratorContext<T, V> =
  | ClassFieldDecoratorContext<T, V>
  | ClassAccessorDecoratorContext<T, V>;

export function codable<T, V>(
  initialValue: any,
  context: CodableFieldDecoratorContext<T, V>
) {
  const isSymbolName = typeof context.name === "symbol";

  if (isSymbolName) throw new Error("Symbol property names are not supported");
}
