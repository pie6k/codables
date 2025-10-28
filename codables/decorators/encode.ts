import { CodableClassFieldsMap, FieldMetadata } from "./registry";
import { getCodableProperties, getExternalProperties } from "./properties";

import { AnyClass } from "./types";
import { externalReference } from "../ExternalReference";

export type ClassEncoder<T extends AnyClass> = (instance: InstanceType<T>) => ConstructorParameters<T>;

function mergeMaps<T, U>(map1: Map<T, U>, map2: Map<T, U>): Map<T, U> {
  const result = new Map(map1);
  for (const [key, value] of map2.entries()) {
    result.set(key, value);
  }
  return result;
}

function getFieldsInfo<T extends AnyClass>(
  Class: T,
  fieldsFromOptions: CodableClassFieldsMap<T>,
): CodableClassFieldsMap<T> {
  const fieldsFromProperties = getCodableProperties(Class);

  return mergeMaps(fieldsFromProperties, fieldsFromOptions);
}

export function createDefaultClassEncoder<T extends AnyClass>(
  Class: T,
  fieldsFromOptions: CodableClassFieldsMap<T>,
): ClassEncoder<T> {
  let fields: CodableClassFieldsMap<T> | null = null;

  // Makes iteration faster by avoiding assignments to local variables
  let instanceKey: string | number | symbol;
  let metadata: FieldMetadata;

  let externalKey: string;
  let externalRef: { key: string; isOptional: boolean };

  return (instance: InstanceType<T>) => {
    const externalKeysMap = getExternalProperties(Class);
    const data: Record<string, any> = {};

    if (!fields) {
      fields = getFieldsInfo(Class, fieldsFromOptions);
    }

    for ([instanceKey, metadata] of fields.entries()) {
      const encodeAs = metadata.encodeAs ?? instanceKey;
      data[encodeAs as string] = instance[instanceKey];
    }

    if (externalKeysMap) {
      for ([externalKey, externalRef] of externalKeysMap.entries()) {
        data[externalKey] = externalReference(externalRef.key, externalRef.isOptional);
      }
    }

    return [data] as ConstructorParameters<T>;
  };
}

export type ClassDecoder<T extends AnyClass> = (data: ConstructorParameters<T>) => InstanceType<T>;

/**
 * Returns map like { "encoded_key": "instance_key" }
 *
 * If it is empty, it means that no keys are remapped.
 */
function createRemappingMap(fields: CodableClassFieldsMap): Map<string, string> {
  const remappingMap = new Map<string, string>();
  for (const [classKey, fieldMeta] of fields.entries()) {
    const encodedAsKey = fieldMeta.encodeAs ?? classKey;

    if (encodedAsKey !== classKey) {
      remappingMap.set(encodedAsKey as string, classKey as string);
    }
  }

  return remappingMap;
}

function unmapKeys(data: Record<string, any>, remappingMap: Map<string, string>): Record<string, any> {
  const unmappedData: Record<string, any> = {};

  for (const [classOrEncodedKey, value] of Object.entries(data)) {
    const instanceKey = remappingMap.get(classOrEncodedKey) ?? classOrEncodedKey;
    unmappedData[instanceKey as string] = value;
  }

  return unmappedData;
}

export function createClassDecoder<T extends AnyClass>(
  Class: T,
  isDefaultEncoder: boolean,
  keysFromOptions: CodableClassFieldsMap<T>,
): ClassDecoder<T> {
  let fields: CodableClassFieldsMap<T> | null = null;
  let remappingMap: Map<string, string> | null = null;

  return (data: ConstructorParameters<T>) => {
    if (!isDefaultEncoder) {
      return new Class(...data);
    }

    let [dataInput] = data;

    if (!fields) {
      fields = getFieldsInfo(Class, keysFromOptions);
    }

    if (remappingMap === null) {
      remappingMap = createRemappingMap(fields);
    }

    if (remappingMap.size > 0) {
      dataInput = unmapKeys(dataInput, remappingMap);
    }

    const instance = new Class(dataInput);

    Object.assign(instance, dataInput);

    return instance;
  };
}
