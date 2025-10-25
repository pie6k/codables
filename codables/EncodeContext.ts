export class EncodeContext {
  private refFirstSeenPath = new WeakMap<object, string>();

  registerNewSeenObject(object: object, path: string) {
    if (this.refFirstSeenPath.has(object)) return;

    this.refFirstSeenPath.set(object, path);
  }

  getAlreadySeenObjectPath(object: object): string | null {
    return this.refFirstSeenPath.get(object) ?? null;
  }
}
