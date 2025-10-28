import { getCodableProperties, getExternalProperties } from "./properties";

import { AnyClass } from "./types";
import { CodableClassFieldsMap } from "./registry";
import { externalReference } from "../ExternalReference";

export type ClassEncoder<T extends AnyClass> = (instance: InstanceType<T>) => ConstructorParameters<T>;

export function createDefaultClassEncoder<T extends AnyClass>(
  Class: T,
  fieldsFromOptions: CodableClassFieldsMap<T>,
): ClassEncoder<T> {
  const fieldsFromOptionsKeys = [...fieldsFromOptions.keys()];
  return (instance: InstanceType<T>) => {
    const keys = getCodableProperties(Class);
    const externalKeys = getExternalProperties(Class) ?? [];
    const data: Record<string, any> = {};

    for (const key of [...keys, ...fieldsFromOptionsKeys]) {
      data[key as string] = instance[key];
    }

    for (const key of externalKeys) {
      data[key] = externalReference(key);
    }

    return [data] as ConstructorParameters<T>;
  };
}

export type ClassDecoder<T extends AnyClass> = (data: ConstructorParameters<T>) => InstanceType<T>;

export function createClassDecoder<T extends AnyClass>(Class: T, isDefaultEncoder: boolean): ClassDecoder<T> {
  return (data: ConstructorParameters<T>) => {
    const instance = new Class(...data);

    if (isDefaultEncoder) {
      const [memberwiseData] = data;
      Object.assign(instance, memberwiseData);
    }

    return instance;
  };
}
