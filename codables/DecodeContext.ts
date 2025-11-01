import { Coder } from "./Coder";
import { Path } from "./utils/path";

export interface DecodeOptions {
  externalReferences?: Record<string, unknown>;
}

export class DecodeContext {
  // Will be filled while decoding the data
  resolvedRefs = new Map<number, object>();

  pendingReferences = new Map<number, Set<Path>>();

  registerPendingReference(id: number, path: Path) {
    const paths = this.pendingReferences.get(id) ?? new Set();
    paths.add(path);
    this.pendingReferences.set(id, paths);
  }

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
    readonly coder: Coder,
    readonly options?: DecodeOptions,
  ) {
    this.externalReferencesMap = new Map(Object.entries(options?.externalReferences ?? {}));
  }
}
