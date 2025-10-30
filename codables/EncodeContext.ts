import { JSONArray, JSONObject } from "./types";

type UnknownMode = "unchanged" | "null" | "throw";

export interface EncodeOptions {
  /**
   * What should happen if some custom class instance is passed to encode, but no
   * matching type is found.
   *
   * - "unchanged": Pass the input as is to the encoded output
   * - "null": Replace the input with null in the encoded output
   * - "throw": Throw an error if no matching type is found
   *
   * @default "null"
   */
  unknownInputMode?: UnknownMode;

  /**
   * Should encoder detect if the same object is seen multiple times in the input so it can
   * re-create those references later, when decoding the data?
   *
   * Note: if disabled, and your input contains circular references, the encoder will throw an error.
   *
   * @default true
   */
  preserveReferences?: boolean;

  /**
   * @default false
   */
  includeErrorStack?: boolean;
}

export class EncodeContext {
  constructor(readonly options?: EncodeOptions) {
    this.unknownMode = options?.unknownInputMode ?? "null";
    this.preserveReferences = options?.preserveReferences ?? true;
  }

  readonly unknownMode: UnknownMode;
  readonly preserveReferences: boolean;

  private seenObjects = new WeakSet<object>();
  private refIdsRegistry = new Map<object, number>();

  private markedAsReferenced = new WeakSet<object>();
  private encodedObjects = new Map<object, JSONObject | JSONArray>();

  private markAllEncodedAsReferenced() {
    for (const [original, id] of this.refIdsRegistry.entries()) {
      const encoded = this.encodedObjects.get(original);

      if (!encoded) {
        throw new Error("Encoded object not found");
      }

      this.markEncodedAsReferenced(original, id);
    }
  }

  finalize() {
    this.markAllEncodedAsReferenced();
  }

  private markEncodedAsReferenced(original: object, id: number) {
    if (this.markedAsReferenced.has(original)) return;

    const encoded = this.encodedObjects.get(original);

    if (!encoded) {
      throw new Error("Encoded object not found");
    }

    if (Array.isArray(encoded)) {
      encoded.unshift(`$$id:${id}`);
    } else {
      encoded["$$id"] = id;
    }

    this.markedAsReferenced.add(original);
  }

  registerEncoded(original: object, encoded: JSONObject | JSONArray) {
    if (!this.preserveReferences) return;

    if (this.encodedObjects.has(original)) {
      console.warn("Object already encoded", original, encoded);
      return;
    }

    this.encodedObjects.set(original, encoded);
  }

  /**
   * Call it the first time some object is seen.
   */
  registerNewSeenObject(object: object) {
    if (!this.preserveReferences) return;

    this.seenObjects.add(object);
  }

  /**
   * Returns where the object was first seen at.
   */
  getAlreadySeenObjectId(original: object): number | null {
    if (!this.preserveReferences) return null;

    if (!this.seenObjects.has(original)) {
      return null;
    }

    const existingId = this.refIdsRegistry.get(original);

    if (existingId !== undefined) {
      return existingId;
    }

    const id = this.refIdsRegistry.size;

    this.refIdsRegistry.set(original, id);

    return id;
  }
}
