import { JSONValue } from "./types";
import { getIsEscapedWrapperKey } from "./escape";

export function analyzeEncodedData(json: JSONValue, context: DecodeContext) {
  if (Array.isArray(json)) {
    for (const item of json) {
      analyzeEncodedData(item, context);
    }
    return;
  }

  if (typeof json === "object" && json !== null) {
    const keys = Object.keys(json);

    if (keys.length === 1) {
      const [key] = keys;

      if (key === "$$ref") {
        const refPath = json["$$ref"] as string;

        if (typeof refPath === "string") {
          context.presentRefAliases.add(refPath);
        }

        return;
        // TODO : seems it is something else, we should keep analyzing the data?
      }

      if (!context.hasCustomTypes && key.startsWith("$$")) {
        context.hasCustomTypes = true;

        // We do not returns, as custom type can have nested data that needs to be analyzed
      }
    }

    for (const key of keys) {
      analyzeEncodedData(json[key], context);
    }
  }
}

export class DecodeContext {
  hasCustomTypes = false;
  // Is ready instantly after analyzing the data
  presentRefAliases = new Set<string>();
  // Will be filled while decoding the data
  resolvedRefs = new Map<string, object>();

  readonly hasRefAliases: boolean;

  registerRefIfNeeded(path: string, object: object) {
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
