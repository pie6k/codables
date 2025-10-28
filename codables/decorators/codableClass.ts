import {
  AnyClass,
  ClassDecorator,
  MakeRequired,
  MemberwiseClass,
} from "./types";
import {
  ClassDecoder,
  ClassEncoder,
  createClassDecoder,
  createDefaultClassEncoder,
} from "./encode";

import { CodableClassDependencies } from "./dependencies";
import { createCoderType } from "../CoderType";
import { getCodableProperties } from "./properties";
import { getPrototypeChainLength } from "./prototype";
import { narrowType } from "../utils/assert";
import { registerCodableClass } from "./registry";

type StringOnly<T> = T extends string ? T : never;

interface CodableClassOptions<T extends AnyClass> {
  dependencies?: CodableClassDependencies;
  encode?: ClassEncoder<T>;
  keys?: Array<keyof InstanceType<T>>;
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

    const keysFromOptions = maybeOptions?.keys?.filter(getIsString) ?? [];

    const encoder: ClassEncoder<T> =
      maybeOptions?.encode ?? createDefaultClassEncoder(Class, keysFromOptions);

    const decoder: ClassDecoder<T> = createClassDecoder(
      Class,
      isUsingDefaultEncoder,
    );

    const type = createCoderType(
      name,
      (value): value is InstanceType<T> => value instanceof Class,
      encoder,
      decoder,
      /**
       * If we have Foo and Bar extending Foo, Bar should always be the first to try to match.
       * As Foo is the parent class, it will also match Bar, resulting in incorrect data being decoded.
       */
      getPrototypeChainLength(Class),
    );

    registerCodableClass(Class, type, maybeOptions?.dependencies);
  };
}
