import * as builtin from "./builtin";

import { CoderType, createCoderType } from "./CoderType";
import { encodeInput, finalizeEncodeWithCircularRefs } from "./encode";

import { CUSTOM_TYPE_INDICATOR_PREFIX } from "./consts";
import { CircularRefsManager } from "./refs";
import { JSONValue } from "./types";
import { decodeInput } from "./decode";
import { getIsRecord } from "./is";

const DEFAULT_TYPES = [...Object.entries(builtin)].map(([name, type]) => {
  return type as CoderType;
});

function parseCustomTypeIndicatorKey(key: string) {
  if (!key.startsWith(CUSTOM_TYPE_INDICATOR_PREFIX)) {
    return null;
  }

  return key.slice(CUSTOM_TYPE_INDICATOR_PREFIX.length);
}

export function parseMaybeCustomTypeWrapper(input: unknown, coder: Coder) {
  if (!getIsRecord(input)) {
    return null;
  }

  const key = Object.keys(input);

  if (key.length !== 1) return null;

  const [customTypeIndicatorKey] = key;

  const customTypeName = parseCustomTypeIndicatorKey(customTypeIndicatorKey);

  if (!customTypeName) return null;

  const customType = coder.getTypeByName(customTypeName);

  if (!customType) return null;

  const data = input[customTypeIndicatorKey] as JSONValue;

  return {
    name: customTypeName,
    type: customType,
    data,
    coder,
  };
}

export type ParsedCustomTypeWrapper = NonNullable<
  ReturnType<typeof parseMaybeCustomTypeWrapper>
>;

export class Coder {
  private types = new Set<CoderType>(DEFAULT_TYPES);

  getTypeByName(name: string): CoderType | null {
    // TODO: Create lookup map
    for (const type of this.types) {
      if (type.name === name) {
        return type;
      }
    }

    return null;
  }

  registerType<Item, Data>(type: CoderType<Item, Data>) {
    this.types.add(type);

    return type;
  }

  addType<Item, Data>(
    name: string,
    canEncode: (value: unknown) => value is Item,
    encode: (data: Item) => Data,
    decode: (data: Data) => Item
  ) {
    return this.registerType(createCoderType(name, canEncode, encode, decode));
  }

  encode<T>(value: T): JSONValue {
    const circularRefsManager = new CircularRefsManager();

    const result = encodeInput(value, circularRefsManager, this, []);

    if (!circularRefsManager.hasCircularRefs) return result;

    return finalizeEncodeWithCircularRefs(result, circularRefsManager);
  }

  decode<T>(value: JSONValue): T {
    const circularRefsMap = new Map<number, unknown>();

    return decodeInput<T>(value, circularRefsMap, this, []);
  }

  stringify<T>(value: T): string {
    return JSON.stringify(this.encode(value));
  }

  parse<T>(value: string): T {
    return this.decode(JSON.parse(value));
  }

  getCoderForInput(input: unknown): CoderType | null {
    for (const type of this.types) {
      if (type.getCanEncode(input)) {
        return type;
      }
    }

    return null;
  }

  parseMaybeCustomTypeWrapper(input: unknown): ParsedCustomTypeWrapper | null {
    return parseMaybeCustomTypeWrapper(input, this);
  }
}

export const coder = new Coder();
