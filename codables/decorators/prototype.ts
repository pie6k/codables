import { AnyClass } from "./types";

export function* iteratePrototypeChain(Class: object): Generator<object> {
  let current = Class;
  while (
    current !== null &&
    current !== Function.prototype &&
    current !== Object.prototype
  ) {
    yield current;
    current = Object.getPrototypeOf(current);
  }
}

export function getPrototypeChainLength(Class: AnyClass): number {
  return [...iteratePrototypeChain(Class)].length;
}
