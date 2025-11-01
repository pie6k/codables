type WithMetadata<T> = T & { [Symbol.metadata]?: DecoratorMetadata };

export function getMetadataKey<T extends object>(Class: T): DecoratorMetadata | null {
  if (!Class) return null;

  return (Class as WithMetadata<T>)[Symbol.metadata] ?? null;
}

if (!Symbol.metadata) {
  Reflect.set(Symbol, "metadata", Symbol.for("Symbol.metadata"));
}

export class PrivateMetadata<T> {
  private registry = new WeakMap<DecoratorMetadata, T>();

  getFor(Class: object) {
    const key = getMetadataKey(Class);

    if (!key) return null;

    return this.get(key);
  }

  get(key: DecoratorMetadata): T | null {
    return this.registry.get(key) ?? null;
  }

  getOrInit(key: DecoratorMetadata, initializer: () => T) {
    if (this.registry.has(key)) return this.registry.get(key)!;

    const value = initializer();

    this.registry.set(key, value);

    return value;
  }

  has(key: DecoratorMetadata) {
    return this.registry.has(key);
  }

  set(key: DecoratorMetadata, value: T) {
    this.registry.set(key, value);
  }

  init(key: DecoratorMetadata, value: T) {
    if (this.registry.has(key)) return this.registry.get(key)!;

    this.registry.set(key, value);

    return value;
  }
}
