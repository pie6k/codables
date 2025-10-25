import { JSONPointer } from "./utils/JSONPointer";

export class EncodeContext {
  private refFirstSeenPath = new WeakMap<object, JSONPointer>();

  registerNewSeenObject(object: object, path: JSONPointer) {
    if (this.refFirstSeenPath.has(object)) return;

    this.refFirstSeenPath.set(object, path);
  }

  getAlreadySeenObjectPath(object: object): string | null {
    const maybePointer = this.refFirstSeenPath.get(object) ?? null;

    return maybePointer?.toString() ?? null;
  }
}
