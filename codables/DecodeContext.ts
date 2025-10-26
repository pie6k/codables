import { JSONArray, JSONObject, JSONValue } from "./types";
import { RefAlias, Tag } from "./format";

import { getDecodableTypeOf } from "./utils/typeof";
import { narrowType } from "./utils/assert";

export function analyzeEncodedData(data: JSONValue, context: DecodeContext) {
  switch (getDecodableTypeOf(data, context)) {
    case "primitive":
      return;
    case "ref-tag":
      narrowType<RefAlias>(data);
      context.presentRefAliases.add(data[1]);
      return;
    case "type-tag":
      narrowType<Tag<JSONValue>>(data);
      context.hasCustomTypes = true;

      analyzeEncodedData(data[1], context);
      return;
    case "array":
      narrowType<JSONArray>(data);
      for (let i = 0; i < data.length; i++) {
        analyzeEncodedData(data[i], context);
      }
      return;
    case "record":
      narrowType<JSONObject>(data);
      for (const key of Object.keys(data)) {
        analyzeEncodedData(data[key], context);
      }
      return;
    case "escaped-tag":
      narrowType<Tag<JSONValue>>(data);
      context.hasEscapedTags = true;

      analyzeEncodedData(data[1], context);
      return;
  }
}

export class DecodeContext {
  hasEscapedTags = false;

  hasCustomTypes = false;
  // Is ready instantly after analyzing the data
  presentRefAliases = new Set<string>();
  // Will be filled while decoding the data
  resolvedRefs = new Map<string, object>();

  readonly hasRefAliases: boolean;

  get isPlainJSON(): boolean {
    return !this.hasEscapedTags && !this.hasCustomTypes && !this.hasRefAliases;
  }

  registerRef(path: string, object: object) {
    if (!this.hasRefAliases || !this.presentRefAliases.has(path)) return;

    this.resolvedRefs.set(path, object);
  }

  resolveRefAlias(path: string) {
    return this.resolvedRefs.get(path) ?? null;
  }

  getIsAliasPresent(path: string) {
    if (!this.hasRefAliases) return false;

    return this.presentRefAliases.has(path);
  }

  constructor(data: JSONValue) {
    analyzeEncodedData(data, this);

    this.hasRefAliases = this.presentRefAliases.size > 0;
  }
}
