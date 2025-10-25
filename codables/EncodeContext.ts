import { JSONPointer } from "./utils/JSONPointer";

export class EncodeContext {
  private refFirstSeenPath = new WeakMap<object, string[]>();

  registerNewSeenObject(object: object, path: string[]) {
    if (this.refFirstSeenPath.has(object)) return;

    this.refFirstSeenPath.set(object, path);
  }

  getAlreadySeenObjectPath(object: object): string | null {
    const maybePathSegments = this.refFirstSeenPath.get(object) ?? null;

    if (!maybePathSegments) return null;

    return new JSONPointer(maybePathSegments).toString();
  }
}
