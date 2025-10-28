import { AnyClass, ClassDecorator, MakeRequired, MemberwiseClass } from "./types";
import { ClassDecoder, ClassEncoder, createClassDecoder, createDefaultClassEncoder } from "./encode";
import { CodableClassFieldsMap, FieldMetadata, codableClassFieldsRegistry, registerCodableClass } from "./registry";
import { CodableType, createCodableType } from "../CodableType";

import { CodableDependencies } from "../dependencies";
import { getPrototypeChainLength } from "./prototype";
import { narrowType } from "../utils/assert";

type StringOnly<T> = T extends string ? T : never;

export type CodableClassKeys<T extends AnyClass> = Array<keyof InstanceType<T>> | CodableClassFieldsMap<T>;

type CodableClassKeysInput<T extends AnyClass> = Array<keyof InstanceType<T>> | Record<keyof InstanceType<T>, string>;

function resolveKeys<T extends AnyClass>(keys: CodableClassKeysInput<T>): CodableClassFieldsMap<T> {
  if (Array.isArray(keys)) {
    const entries = keys.map((key) => [key, {} as FieldMetadata] as const);

    return new Map(entries);
  }

  const entries = Object.entries(keys).map(([key, value]) => {
    return [
      //
      key,
      { encodeAs: value } as FieldMetadata,
    ] as const;
  });

  return new Map(entries);
}

interface CodableClassOptions<T extends AnyClass> {
  dependencies?: CodableDependencies;
  encode?: ClassEncoder<T>;
  keys?: CodableClassKeysInput<T>;
}

type CodableClassDecoratorArgs<T extends AnyClass> =
  T extends MemberwiseClass<T>
    ? // Memberwise class does not require an encode function
      [string, CodableClassOptions<T> | void]
    : // Non-memberwise is constructer in a custom way so we require an explicit encode function
      [string, MakeRequired<CodableClassOptions<T>, "encode">];

type A = CodableClassDecoratorArgs<AnyClass>;

function getIsString(value: unknown): value is string {
  return typeof value === "string";
}

export function codableClass<T extends AnyClass>(
  ...[name, maybeOptions]: CodableClassDecoratorArgs<T>
): ClassDecorator<T> {
  narrowType<CodableClassOptions<T> | undefined>(maybeOptions);

  return (Class: T, context: ClassDecoratorContext<T>) => {
    const isUsingDefaultEncoder = maybeOptions?.encode === undefined;

    const keysFromOptions = resolveKeys(maybeOptions?.keys ?? []);

    const encoder: ClassEncoder<T> = maybeOptions?.encode ?? createDefaultClassEncoder(Class, keysFromOptions);
    const decoder: ClassDecoder<T> = createClassDecoder(Class, isUsingDefaultEncoder, keysFromOptions);

    const type = createCodableType(
      name,
      (value): value is InstanceType<T> => value instanceof Class,
      encoder,
      decoder,
      /**
       * If we have Foo and Bar extending Foo, Bar should always be the first to try to match.
       * As Foo is the parent class, it will also match Bar, resulting in incorrect data being decoded.
       */
      {
        priority: getPrototypeChainLength(Class),
        dependencies: maybeOptions?.dependencies,
      },
    );

    registerCodableClass(context.metadata, {
      name,
      codableType: type as CodableType<any, any>,
    });

    const fieldsMap = codableClassFieldsRegistry.getOrInit(context.metadata, () => new Map());

    for (const [key, metadata] of keysFromOptions.entries()) {
      if (fieldsMap.has(key)) continue;

      fieldsMap.set(key, metadata);
    }
  };
}
