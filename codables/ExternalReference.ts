import { createCodableType } from "./CodableType";

export class ExternalReference<T> {
  constructor(
    public readonly key: string,
    readonly isOptional = false,
  ) {}
}

export function externalReference<T>(key: string, isOptional = false): T {
  return new ExternalReference<T>(key, isOptional) as unknown as T;
}

export const $$externalReference = createCodableType(
  "external",
  (value) => value instanceof ExternalReference,
  (ref) => {
    return { key: ref.key, isOptional: ref.isOptional };
  },
  ({ key, isOptional }, context) => {
    if (!context.externalReferencesMap.has(key)) {
      if (isOptional) return void 0;

      throw new Error(`External reference "${key}" not found`);
    }

    // Special case - it expect us to return instance of ExternalReference,
    // but we actually return the value from the external references map
    return context.externalReferencesMap.get(key) as any;
  },
);
