import { getIsForbiddenProperty } from "./security";

function* iteratePrototypeChain(input: object): Generator<object> {
  let current = input;
  while (current !== null) {
    yield current;
    current = Object.getPrototypeOf(current);
  }
}

function* iterateOwnProperties(
  instance: object
): Generator<[PropertyKey, PropertyDescriptor]> {
  const descriptors = Object.getOwnPropertyDescriptors(instance);

  for (const [key, descriptor] of Object.entries(descriptors)) {
    yield [key, descriptor];
  }
}

export function* iterateAllProperties(
  instance: object
): Generator<[PropertyKey, PropertyDescriptor]> {
  const alreadySeenProperties = new Set<PropertyKey>();

  for (const prototype of iteratePrototypeChain(instance)) {
    if (prototype === Object.prototype) continue;

    for (const [key, descriptor] of iterateOwnProperties(prototype)) {
      if (alreadySeenProperties.has(key)) continue;

      alreadySeenProperties.add(key);

      yield [key, descriptor];
    }
  }
}

function getIsDescriptorCodable(
  key: PropertyKey,
  descriptor: PropertyDescriptor
): boolean {
  if (typeof key !== "string") return false;
  if (getIsForbiddenProperty(key)) return false;

  if (descriptor.value !== undefined && typeof descriptor.value !== "function")
    return true;
  if (descriptor.get && descriptor.set) return true;

  return false;
}

export function detectCodableProperties(instance: object): string[] {
  const properties: string[] = [];

  for (const [key, descriptor] of iterateAllProperties(instance)) {
    if (!getIsDescriptorCodable(key, descriptor)) continue;

    properties.push(key as string);
  }

  return properties;
}
