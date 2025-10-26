import { Tag, TagKey } from "./format";

interface CoderTypeDefinition<Item, Data> {
  name: string;
  canHandle: (value: unknown) => value is Item;
  encode: (data: Item) => Data;
  decode: (data: Data) => Item;
}

export function createTag<Name extends string, Data>(name: Name, data: Data) {
  const tag = {} as Tag<Data, Name>;

  tag[`$$${name}`] = data;

  return tag;
}

export class CoderType<Item = any, Data = any> {
  constructor(readonly definition: CoderTypeDefinition<Item, Data>) {
    this.name = definition.name;
    this.tagKey = `$$${this.name}`;
  }

  readonly name: string;

  readonly tagKey: TagKey<typeof this.name>;

  encode(value: Item): Data {
    return this.definition.encode(value);
  }

  encodeTag(value: Item): Tag<Data, typeof this.name> {
    return createTag(this.name, this.encode(value));
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
