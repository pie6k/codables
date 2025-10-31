import { JSONValue } from "./types";
import { tryToSetInParent } from "./utils/misc";

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

  private readonly warnedOnce = new Set<string>();

  warnOnce(key: string, message: string) {
    if (this.warnedOnce.has(key)) return;

    this.warnedOnce.add(key);

    console.warn(message);
  }

  readonly externalReferencesMap: Map<string, unknown>;

  constructor(
    data: JSONValue,
    readonly options?: DecodeOptions,
  ) {
    this.externalReferencesMap = new Map(Object.entries(options?.externalReferences ?? {}));
  }
}
