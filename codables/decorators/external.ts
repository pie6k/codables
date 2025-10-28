import { codableClassFieldsRegistry, externalClassFieldsRegistry } from "./registry";

import { AnyClass } from "./types";
import { externalReference } from "../ExternalReference";

type CodableFieldDecoratorContext<T, V> = ClassFieldDecoratorContext<T, V> | ClassAccessorDecoratorContext<T, V>;

export function getRegisteredCodableFields(Class: AnyClass) {
  return codableClassFieldsRegistry.getFor(Class);
}

interface CodableOptions {
  encodeAs?: string;
}

export function external<T, V>(key: string) {
  return function external<T, V>(initialValue: any, context: CodableFieldDecoratorContext<T, V>) {
    const externalFieldsMap = externalClassFieldsRegistry.getOrInit(context.metadata, () => new Map());

    if (typeof context.name !== "string") {
      throw new Error("External decorator can only be used on string properties");
    }

    if (codableClassFieldsRegistry.get(context.metadata)?.has(context.name)) {
      throw new Error("External decorator cannot be used on codable properties");
    }

    externalFieldsMap.set(context.name, key);
  };
}
