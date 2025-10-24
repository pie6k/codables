import { TypeKey, TypeWrapper } from "./format";

import { Coder } from "./Coder";
import { getIsRecord } from "./is";

interface CoderTypeDefinition<Item, Data> {
  name: string;
  encode: (data: Item) => Data;
  decode: (data: Data) => Item;
  canHandle: (value: unknown) => value is Item;
}

function wrapAsCustomType<Name extends string, Data>(
  name: Name,
  data: Data
): TypeWrapper<Data, Name> {
  return {
    [`$$${name}`]: data,
  } as TypeWrapper<Data, Name>;
}

export class CoderType<Item = any, Data = any> {
  constructor(readonly definition: CoderTypeDefinition<Item, Data>) {}

  get name() {
    return this.definition.name;
  }

  get wrapperKey(): TypeKey<typeof this.name> {
    return `$$${this.name}`;
  }

  get encoder() {
    return this.definition.encode;
  }

  get decoder() {
    return this.definition.decode;
  }

  encode(value: Item): TypeWrapper<Data, typeof this.name> {
    const encodedData = this.encoder(value);

    return wrapAsCustomType(this.name, encodedData);
  }

  canHandle(value: unknown): value is Item {
    return this.definition.canHandle(value);
  }
}

export function createCoderType<Item, Data>(
  name: string,
  canHandle: (value: unknown) => value is Item,
  encode: (data: Item) => Data,
  decode: (data: Data) => Item
): CoderType<Item, Data> {
  return new CoderType({
    name,
    canHandle,
    encode,
    decode,
  });
}

export function getIsCoderType(value: unknown): value is CoderType {
  return value instanceof CoderType;
}
