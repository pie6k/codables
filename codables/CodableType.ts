import { Tag, TagKey } from "./format";

import { CodableDependencies } from "./dependencies";
import { DecodeContext } from "./DecodeContext";
import { EncodeContext } from "./EncodeContext";

export interface CodableTypeOptions {
  priority?: number;
  dependencies?: CodableDependencies;
  isFlat?: boolean;
}

interface CodableTypeDefinition<Item, Data> {
  name: string;
  canHandle: (value: unknown) => value is Item;
  encode: (data: Item, context: EncodeContext) => Data;
  decode: (data: Data, context: DecodeContext) => Item;
  options?: CodableTypeOptions;
}

export function createTag<Name extends string, Data>(name: Name, data: Data) {
  const tag = {} as Tag<Data, Name>;

  tag[`$$${name}`] = data;

  return tag;
}

/**
 * Custom class types have priority = amount of classes they extend. This is to ensure that child classes are checked first.
 * However, we still want built-in types, like `Map`, to be checked before those as they are certainly more common.
 *
 * If it is 0, custom class types would always be checked before built-in types, degrading performance.
 */
const DEFAULT_PRIORITY = 10;

export class CodableType<Item = any, Data = any> {
  constructor(readonly definition: CodableTypeDefinition<Item, Data>) {
    this.name = definition.name;
    this.tagKey = `$$${this.name}`;
    this.priority = definition.options?.priority ?? DEFAULT_PRIORITY;
    this.dependencies = definition.options?.dependencies ?? null;
    this.isFlat = definition.options?.isFlat ?? false;
  }

  readonly name: string;
  readonly priority: number;
  readonly dependencies: CodableDependencies | null;
  readonly isFlat: boolean;

  readonly tagKey: TagKey<typeof this.name>;

  encode(value: Item, context: EncodeContext): Data {
    return this.definition.encode(value, context);
  }

  encodeTag(value: Item, context: EncodeContext): Tag<Data, typeof this.name> {
    return createTag(this.name, this.encode(value, context));
  }

  decode(data: Data, context: DecodeContext): Item {
    return this.definition.decode(data, context);
  }

  canHandle(value: unknown): value is Item {
    return this.definition.canHandle(value);
  }

  createTag(data: Data): Tag<Data, typeof this.name> {
    return createTag(this.name, data);
  }
}

export function createCodableType<Item, Data>(
  name: string,
  canHandle: (value: unknown) => value is Item,
  encode: (data: Item, context: EncodeContext) => Data,
  decode: (data: Data, context: DecodeContext) => Item,
  options?: CodableTypeOptions,
): CodableType<Item, Data> {
  return new CodableType({
    name,
    canHandle,
    encode,
    decode,
    options,
  });
}

export function getIsCodableType(value: unknown): value is CodableType {
  return value instanceof CodableType;
}
