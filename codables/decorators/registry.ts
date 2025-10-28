import {
  CodableClassDependencies,
  registerCodableClassDependencies,
} from "./dependencies";

import { AnyClass } from "./types";
import { CoderType } from "../CoderType";
import { Thunk } from "../utils/misc";

const codableClassRegistry = new WeakMap<AnyClass, CoderType>();

type ClassCoderType<T extends AnyClass> = CoderType<
  InstanceType<T>,
  ConstructorParameters<T>
>;

export function registerCodableClass<T extends AnyClass>(
  Class: T,
  coderType: ClassCoderType<T>,
  dependencies?: CodableClassDependencies,
) {
  if (codableClassRegistry.has(Class)) {
    throw new Error(`Codable class "${Class.name}" already registered`);
  }

  codableClassRegistry.set(Class, coderType);

  if (dependencies) {
    registerCodableClassDependencies(Class, dependencies);
  }
}

export function getIsCodableClass<T extends AnyClass>(
  Class: object,
): Class is AnyClass {
  return codableClassRegistry.has(Class as AnyClass);
}

export function getCodableClassType<T extends AnyClass>(
  Class: T,
): ClassCoderType<T> | null {
  return codableClassRegistry.get(Class) ?? null;
}
