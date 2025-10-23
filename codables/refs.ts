import { getIsRecord } from "./is";

type RefSourceKey = `$$ref:${number}`;

export type CircularRefSource<T extends object> = {
  [key in RefSourceKey]: T;
};

export type CircularRefAlias = {
  $$ref: number;
};

export type CircularRefInfo =
  | {
      type: "source";
      id: number;
      source: object;
    }
  | {
      type: "alias";
      id: number;
    };

export function parseMaybeCircularRefInfo(
  input: unknown
): CircularRefInfo | null {
  if (!getIsRecord(input)) {
    return null;
  }

  const key = Object.keys(input);

  if (key.length !== 1) return null;

  const [refKey] = key;

  if (refKey === "$$ref") {
    return {
      type: "alias",
      id: input[refKey] as number,
    };
  }

  if (refKey.startsWith("$$ref:")) {
    const id = parseInt(refKey.slice("$$ref:".length));
    return {
      type: "source",
      id,
      source: input[refKey] as object,
    };
  }

  return null;
}

export class CircularRefsManager {
  private refFirstSeenPath = new WeakMap<object, string[]>();
  private circularRefIds = new Map<object, number>();
  private circularRefIdRef = new Map<number, object>();

  *iterateCircularRefsSourcePaths() {
    for (const [refId, ref] of this.circularRefIdRef) {
      const path = this.refFirstSeenPath.get(ref)!;

      yield [refId, path] as const;
    }
  }

  registerKnownRef(value: object, path: string[]): void {
    this.refFirstSeenPath.set(value, path);
  }

  hasKnownRef(value: object): boolean {
    return this.refFirstSeenPath.has(value);
  }

  getCircularRefId(value: object): number | null {
    return this.circularRefIds.get(value) ?? null;
  }

  getIsCircularRef(value: object): boolean {
    return this.circularRefIds.has(value);
  }

  registerCircularRef(value: object): number {
    const existingRef = this.getCircularRefId(value);

    if (existingRef !== null) {
      return existingRef;
    }

    const refId = this.circularRefIds.size;
    this.circularRefIds.set(value, refId);
    this.circularRefIdRef.set(refId, value);

    return refId;
  }

  handleNewRef(value: object, path: string[]) {
    if (!this.refFirstSeenPath.has(value)) {
      this.registerKnownRef(value, path);
      return null;
    }

    // Did already see this ref, so it's circular
    return this.registerCircularRef(value);
  }

  getCircularRefAlias(value: object): CircularRefAlias | null {
    const ref = this.getCircularRefId(value);
    if (ref === null) {
      return null;
    }

    return { $$ref: ref };
  }

  get hasCircularRefs(): boolean {
    return this.circularRefIds.size > 0;
  }

  getRefIdFirstSeenPath(refId: number): string[] | null {
    const ref = this.circularRefIdRef.get(refId);

    if (!ref) return null;

    return this.refFirstSeenPath.get(ref) ?? null;
  }

  getRefId(ref: object): number | null {
    return this.circularRefIds.get(ref) ?? null;
  }
}
