import { Tag, TagKey } from "./format";

import { DecodeContext } from "./DecodeContext";
import { EncodeContext } from "./EncodeContext";

interface CoderTypeDefinition<Item, Data> {
  name: string;
  canHandle: (value: unknown) => value is Item;
  encode: (data: Item, context: EncodeContext) => Data;
  decode: (data: Data, context: DecodeContext) => Item;
  priority?: number;
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
    this.priority = definition.priority ?? 0;
  }

  readonly name: string;
  readonly priority: number;

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

export function createCoderType<Item, Data>(
  name: string,
  canHandle: (value: unknown) => value is Item,
  encode: (data: Item, context: EncodeContext) => Data,
  decode: (data: Data, context: DecodeContext) => Item,
  priority?: number,
): CoderType<Item, Data> {
  return new CoderType({
    name,
    canHandle,
    encode,
    decode,
    priority,
  });
}

export function getIsCoderType(value: unknown): value is CoderType {
  return value instanceof CoderType;
}
