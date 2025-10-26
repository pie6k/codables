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
}

export class EncodeContext {
  constructor(readonly options?: EncodeOptions) {
    this.unknownMode = options?.unknownInputMode ?? "null";
    this.preserveReferences = options?.preserveReferences ?? true;
  }

  readonly unknownMode: UnknownMode;
  readonly preserveReferences: boolean;

  private refFirstSeenPath = new Map<object, string>();

  /**
   * Call it the first time some object is seen.
   */
  registerNewSeenObject(object: object, path: string) {
    this.refFirstSeenPath.set(object, path);
  }

  /**
   * Returns where the object was first seen at.
   */
  getAlreadySeenObjectPath(object: object): string | null {
    return this.refFirstSeenPath.get(object) ?? null;
  }
}
