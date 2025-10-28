import { CodableClassDependencies, registerCodableClassDependencies } from "./dependencies";
import { PrivateMetadata, getMetadataKey } from "./PrivateMetadata";

import { AnyClass } from "./types";
import { CoderType } from "../CoderType";

export interface FieldMetadata {
  encodeAs?: string;
}

export type ClassCoderType<T extends AnyClass> = CoderType<InstanceType<T>, ConstructorParameters<T>>;

export type CodableClassFieldsMap<T extends AnyClass = AnyClass> = Map<keyof InstanceType<T>, FieldMetadata>;

export interface CodableClassMetadata<T extends AnyClass = AnyClass> {
  name: string;
  coderType: ClassCoderType<T>;
  dependencies?: CodableClassDependencies;
}

export const codableClassRegistry = new PrivateMetadata<CodableClassMetadata>();
export const codableClassFieldsRegistry = new PrivateMetadata<CodableClassFieldsMap>();
export const externalClassFieldsRegistry = new PrivateMetadata<Map<string, string>>();

export function registerCodableClass<T extends AnyClass>(key: DecoratorMetadata, metadata: CodableClassMetadata<T>) {
  return codableClassRegistry.init(key, metadata);
}

export function getIsCodableClass<T extends AnyClass>(Class: object): Class is AnyClass {
  const key = getMetadataKey(Class);

  if (!key) return false;

  return codableClassRegistry.has(key);
}

export function getCodableClassType<T extends AnyClass>(Class: T): ClassCoderType<T> | null {
  const key = getMetadataKey(Class);

  if (!key) return null;

  const coderType = codableClassRegistry.get(key)?.coderType;

  if (!coderType) return null;

  return coderType as CoderType<any, any>;
}
