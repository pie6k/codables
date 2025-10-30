import { JSONArray, JSONObject, JSONValue } from "./types";

import { narrowType } from "./utils/assert";

export interface DecodeOptions {
  externalReferences?: Record<string, unknown>;
}

export class DecodeContext {
  // Will be filled while decoding the data
  resolvedRefs = new Map<number, object>();

  /**
   * Some object needed by some alias (list prepared before) is ready to be used.
   */
  registerRef(id: number, object: object) {
    this.resolvedRefs.set(id, object);
  }

  resolveRefId(id: number): object | null {
    return this.resolvedRefs.get(id) ?? null;
  }

  readonly externalReferencesMap: Map<string, unknown>;

  constructor(
    data: JSONValue,
    readonly options?: DecodeOptions,
  ) {
    this.externalReferencesMap = new Map(Object.entries(options?.externalReferences ?? {}));
  }
}
