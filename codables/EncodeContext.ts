export class EncodeContext {
  constructor() {}

  private refFirstSeenPath = new WeakMap<object, string>();

  /**
   * Call it the first time some object is seen.
   */
  registerNewSeenObject(object: object, path: string) {
    if (this.refFirstSeenPath.has(object)) return;

    this.refFirstSeenPath.set(object, path);
  }

  /**
   * Returns where the object was first seen at.
   */
  getAlreadySeenObjectPath(object: object): string | null {
    return this.refFirstSeenPath.get(object) ?? null;
  }
}
