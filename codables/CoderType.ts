import { Coder } from "./Coder";
import { getIsRecord } from "./is";

interface CoderTypeDefinition<Item, Data> {
  name: string;
  encode: (data: Item) => Data;
  decode: (data: Data) => Item;
  canEncode: (value: unknown) => value is Item;
}

type CustomTypeKey<Name extends string> = `$$${Name}`;

type CustomTypeWrapper<Name extends string, Type> = {
  [key in CustomTypeKey<Name>]: Type;
};

function wrapAsCustomType<Name extends string, Data>(
  name: Name,
  data: Data
): CustomTypeWrapper<Name, Data> {
  const wrapper = {
    [`$$${name}`]: data,
  } as CustomTypeWrapper<Name, Data>;

  return wrapper;
}

export class CoderType<Item = any, Data = any> {
  constructor(readonly definition: CoderTypeDefinition<Item, Data>) {}

  get name() {
    return this.definition.name;
  }

  get encoder() {
    return this.definition.encode;
  }

  get decoder() {
    return this.definition.decode;
  }

  encode(value: Item): CustomTypeWrapper<string, Data> {
    const encodedData = this.encoder(value);

    return wrapAsCustomType(this.name, encodedData);
  }

  getCanEncode(value: unknown): value is Item {
    return this.definition.canEncode(value);
  }
}

export function createCoderType<Item, Data>(
  name: string,
  canEncode: (value: unknown) => value is Item,
  encode: (data: Item) => Data,
  decode: (data: Data) => Item
): CoderType<Item, Data> {
  return new CoderType({
    name,
    canEncode,
    encode,
    decode,
  });
}
