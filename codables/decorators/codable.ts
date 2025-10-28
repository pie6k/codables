import { PrivateMetadata, getMetadataKey } from "./PrivateMetadata";
import { codableClassFieldsRegistry, externalClassFieldsRegistry } from "./registry";

import { AnyClass } from "./types";
import { removeUndefinedProperties } from "../utils/misc";

type CodableFieldDecoratorContext<T, V> = ClassFieldDecoratorContext<T, V> | ClassAccessorDecoratorContext<T, V>;

export function getRegisteredCodableFields(Class: AnyClass) {
  return codableClassFieldsRegistry.getFor(Class);
}

interface CodableOptions {
  encodeAs?: string;
}

type CodableOptionsInput = string | CodableOptions;

function resolveCodableOptions(options?: CodableOptionsInput): CodableOptions | null {
  if (typeof options === "string") {
    return { encodeAs: options };
  }

  return options ?? null;
}

export function codable<T, V>(optionsInput?: CodableOptionsInput) {
  const options = resolveCodableOptions(optionsInput);
  return function codable<T, V>(initialValue: any, context: CodableFieldDecoratorContext<T, V>) {
    if (context.kind !== "accessor" && context.kind !== "field") {
      throw new Error("Codable decorator can only be used on fields or accessors");
    }

    const isSymbolName = typeof context.name === "symbol";

    if (isSymbolName) throw new Error("Symbol property names are not supported");

    if (externalClassFieldsRegistry.get(context.metadata)?.has(context.name)) {
      throw new Error("Codable decorator cannot be used on external properties");
    }

    const fieldsMap = codableClassFieldsRegistry.getOrInit(context.metadata, () => new Map());

    fieldsMap.set(context.name, removeUndefinedProperties({ encodeAs: options?.encodeAs }));
  };
}
