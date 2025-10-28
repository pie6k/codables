type WithMetadata<T> = T & { [Symbol.metadata]?: DecoratorMetadata };

function getMetadataKey<T extends object>(Class: T): DecoratorMetadata | null {
  return (Class as WithMetadata<T>)[Symbol.metadata] ?? null;
}

if (!Symbol.metadata) {
  Reflect.set(Symbol, "metadata", Symbol.for("Symbol.metadata"));
}

export class PrivateMetadata<T> {
  private registry = new WeakMap<DecoratorMetadata, T>();

  constructor(private readonly defaultValue: () => T) {}

  getFor(Class: object) {
    const key = getMetadataKey(Class);

    if (!key) return null;

    return this.get(key);
  }

  get(key: DecoratorMetadata): T | null {
    return this.registry.get(key) ?? null;
  }

  init(key: DecoratorMetadata): T {
    if (this.registry.has(key)) return this.registry.get(key)!;

    const value = this.defaultValue();

    this.registry.set(key, value);

    return value;
  }

  isInitialized(Class: object) {
    const key = getMetadataKey(Class);

    if (!key) throw new Error("Metadata key not found");

    return this.registry.has(key);
  }
}
