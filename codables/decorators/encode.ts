import { AnyClass } from "./types";
import { getCodableProperties } from "./properties";

export type ClassEncoder<T extends AnyClass> = (
  instance: InstanceType<T>,
) => ConstructorParameters<T>;

export function createDefaultClassEncoder<T extends AnyClass>(
  Class: T,
  extraKeys: Array<keyof InstanceType<T>>,
): ClassEncoder<T> {
  return (instance: InstanceType<T>) => {
    const keys = getCodableProperties(Class);
    const data: Record<string, any> = {};

    for (const key of [...keys, ...extraKeys]) {
      data[key as string] = instance[key];
    }

    return [data] as ConstructorParameters<T>;
  };
}

export type ClassDecoder<T extends AnyClass> = (
  data: ConstructorParameters<T>,
) => InstanceType<T>;

export function createClassDecoder<T extends AnyClass>(
  Class: T,
  isDefaultEncoder: boolean,
): ClassDecoder<T> {
  return (data: ConstructorParameters<T>) => {
    const instance = new Class(...data);

    if (isDefaultEncoder) {
      const [memberwiseData] = data;
      Object.assign(instance, memberwiseData);
    }

    return instance;
  };
}
