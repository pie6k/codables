import { PrivateMetadata, getMetadataKey } from "./PrivateMetadata";

import { AnyClass } from "./types";
import { CodableDependencies } from "../dependencies";
import { CodableType } from "../CodableType";
import { getIsObject } from "../is";

export interface FieldMetadata {
  encodeAs?: string;
}

export type ClassCodableType<T extends AnyClass> = CodableType<InstanceType<T>, ConstructorParameters<T>>;

export type CodableClassFieldsMap<T extends AnyClass = AnyClass> = Map<keyof InstanceType<T>, FieldMetadata>;

export interface CodableClassMetadata<T extends AnyClass = AnyClass> {
  name: string;
  codableType: ClassCodableType<T>;
}

export const codableClassRegistry = new PrivateMetadata<CodableClassMetadata>();
export const codableClassFieldsRegistry = new PrivateMetadata<CodableClassFieldsMap>();
export const externalClassFieldsRegistry = new PrivateMetadata<Map<string, { key: string; isOptional: boolean }>>();

export function getIsCodableClass(Class: object): Class is AnyClass {
  const key = getMetadataKey(Class);

  if (!key) return false;

  return codableClassRegistry.has(key);
}

export function getIsCodableClassInstance(instance: object): InstanceType<AnyClass> {
  if (!getIsObject(instance)) return false;

  const key = getMetadataKey(instance.constructor);

  if (!key) return false;

  return codableClassRegistry.has(key);
}

export function getCodableClassType<T extends AnyClass>(Class: T): ClassCodableType<T> | null {
  const key = getMetadataKey(Class);

  if (!key) return null;

  const codableType = codableClassRegistry.get(key)?.codableType;

  if (!codableType) return null;

  return codableType as CodableType<any, any>;
}
