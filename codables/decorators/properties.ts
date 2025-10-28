import { AnyClass } from "./types";
import { externalClassFieldsRegistry } from "./registry";
import { getIsForbiddenProperty } from "../utils/security";
import { getRegisteredCodableFields } from "./codable";
import { iteratePrototypeChain } from "./prototype";

function* iterateOwnPropertyDescriptors(thing: object): Generator<[string, PropertyDescriptor]> {
  if (!thing) return;

  const descriptors = Object.getOwnPropertyDescriptors(thing);

  for (const [key, descriptor] of Object.entries(descriptors)) {
    yield [key, descriptor];
  }
}

function collectRegisteredCodableFields(Class: AnyClass) {
  const keys = new Set<string>();

  for (const ClassInPrototype of iteratePrototypeChain(Class)) {
    const registeredKeysMap = getRegisteredCodableFields(ClassInPrototype as AnyClass);

    if (!registeredKeysMap) continue;

    for (const key of registeredKeysMap.keys()) {
      keys.add(key as string);
    }
  }

  if (keys.size === 0) return null;

  return keys;
}

export function getCodableProperties(Class: AnyClass) {
  const explicitlyRegisteredKeys = collectRegisteredCodableFields(Class);

  if (explicitlyRegisteredKeys) {
    return [...explicitlyRegisteredKeys];
  }

  return [];
}

export function getExternalProperties(Class: AnyClass) {
  const externalFieldsMap = externalClassFieldsRegistry.getFor(Class);

  if (!externalFieldsMap) return null;

  return externalFieldsMap;
}
