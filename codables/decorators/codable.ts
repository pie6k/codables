import { AnyClass } from "./types";
import { PrivateMetadata } from "./metadata";

const fieldsMetadata = new PrivateMetadata(() => new Map<string, any>());

type CodableFieldDecoratorContext<T, V> =
  | ClassFieldDecoratorContext<T, V>
  | ClassAccessorDecoratorContext<T, V>;

export function getRegisteredCodableFields(Class: AnyClass) {
  return fieldsMetadata.getFor(Class);
}

export function codable<T, V>() {
  return function codable<T, V>(
    initialValue: any,
    context: CodableFieldDecoratorContext<T, V>,
  ) {
    if (context.kind !== "accessor" && context.kind !== "field") {
      throw new Error(
        "Codable decorator can only be used on fields or accessors",
      );
    }

    const isSymbolName = typeof context.name === "symbol";

    if (isSymbolName)
      throw new Error("Symbol property names are not supported");

    const codableMetadata = fieldsMetadata.init(context.metadata);

    codableMetadata.set(context.name, initialValue);
  };
}
