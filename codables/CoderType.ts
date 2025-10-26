import { Tag, TagKey } from "./format";

interface CoderTypeDefinition<Item, Data> {
  name: string;
  canHandle: (value: unknown) => value is Item;
  encode: (data: Item) => Data;
  decode: (data: Data) => Item;
}

export function createTag<Name extends string, Data>(name: Name, data: Data) {
  return {
    [`$$${name}`]: data,
  } as Tag<Data, Name>;
}

export class CoderType<Item = any, Data = any> {
  constructor(readonly definition: CoderTypeDefinition<Item, Data>) {}

  get name() {
    return this.definition.name;
  }

  get tagKey(): TagKey<typeof this.name> {
    return `$$${this.name}`;
  }

  private get encoder() {
    return this.definition.encode;
  }

  private get decoder() {
    return this.definition.decode;
  }

  encode(value: Item): Data {
    return this.encoder(value);
  }

  encodeTag(value: Item): Tag<Data, typeof this.name> {
    return createTag(this.name, this.encoder(value));
  }

  decode(data: Data): Item {
    return this.definition.decode(data);
  }

  canHandle(value: unknown): value is Item {
    return this.definition.canHandle(value);
  }

  createTag(data: Data): Tag<Data, typeof this.name> {
    return createTag(this.name, data);
  }
}

export function createCoderType<Item, Data>(
  name: string,
  canHandle: (value: unknown) => value is Item,
  encode: (data: Item) => Data,
  decode: (data: Data) => Item,
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
