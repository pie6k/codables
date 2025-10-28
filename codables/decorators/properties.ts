import { CodableClassFieldsMap, externalClassFieldsRegistry } from "./registry";

import { AnyClass } from "./types";
import { getIsForbiddenProperty } from "../utils/security";
import { getRegisteredCodableFields } from "./codable";
import { iteratePrototypeChain } from "./prototype";

function collectRegisteredCodableFields(Class: AnyClass, keysMap: CodableClassFieldsMap) {
  for (const ClassInPrototype of iteratePrototypeChain(Class)) {
    const registeredKeysMap = getRegisteredCodableFields(ClassInPrototype as AnyClass);

    if (!registeredKeysMap) continue;

    for (const [key, metadata] of registeredKeysMap.entries()) {
      keysMap.set(key, metadata);
    }
  }

  if (keysMap.size === 0) return null;

  return keysMap;
}

export function getCodableProperties(Class: AnyClass) {
  const keysMap: CodableClassFieldsMap = new Map();

  collectRegisteredCodableFields(Class, keysMap);

  return keysMap;
}

export function getExternalProperties(Class: AnyClass) {
  const externalFieldsMap = externalClassFieldsRegistry.getFor(Class);

  if (!externalFieldsMap) return null;

  return externalFieldsMap;
}
