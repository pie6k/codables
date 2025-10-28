import { PrivateMetadata, getMetadataKey } from "./PrivateMetadata";
import { codableClassFieldsRegistry, externalClassFieldsRegistry } from "./registry";

import { AnyClass } from "./types";

type CodableFieldDecoratorContext<T, V> = ClassFieldDecoratorContext<T, V> | ClassAccessorDecoratorContext<T, V>;

export function getRegisteredCodableFields(Class: AnyClass) {
  return codableClassFieldsRegistry.getFor(Class);
}

interface CodableOptions {
  encodeAs?: string;
}

export function codable<T, V>(options?: CodableOptions) {
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

    fieldsMap.set(context.name, { encodeAs: options?.encodeAs });
  };
}
