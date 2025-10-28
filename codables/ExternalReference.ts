import { createCoderType } from "./CoderType";

export class ExternalReference<T> {
  constructor(public readonly key: string) {}
}

export function externalReference<T>(key: string): T {
  return new ExternalReference<T>(key) as unknown as T;
}

export const $$externalReference = createCoderType(
  "external",
  (value) => value instanceof ExternalReference,
  (value) => value.key,
  (key, context) => {
    if (!context.externalReferencesMap.has(key)) {
      throw new Error(`External reference "${key}" not found`);
    }

    // Special case - it expect us to return instance of ExternalReference,
    // but we actually return the value from the external references map
    return context.externalReferencesMap.get(key) as any;
  },
);
