import { Thunk, resolveThunk } from "../utils/misc";

import { AnyClass } from "./types";

export type CodableClassDependencies = Thunk<AnyClass[]>;

const dependenciesRegistry = new WeakMap<DecoratorMetadata, CodableClassDependencies>();

function getFlatDependencies(Class: AnyClass) {
  const key = Class[Symbol.metadata];

  if (!key) return null;

  return dependenciesRegistry.get(key) ?? null;
}

export function registerCodableClassDependencies<T extends AnyClass>(
  key: DecoratorMetadata,
  dependencies: CodableClassDependencies,
) {
  if (dependenciesRegistry.has(key)) {
    throw new Error(`Codable class already registered dependencies`);
  }

  dependenciesRegistry.set(key, dependencies);
}

export function resolveCodableClassDependencies<T extends AnyClass>(Class: T): AnyClass[] {
  const result: Set<AnyClass> = new Set();

  let dependenciesToCheck = new Set<AnyClass>([Class]);
  let nextDependenciesToCheck = new Set<AnyClass>();

  while (true) {
    for (const dependency of dependenciesToCheck) {
      if (result.has(dependency)) continue;
      result.add(dependency);
      const nestedDependencies = getFlatDependencies(dependency);

      if (!nestedDependencies) continue;

      for (const dependency of resolveThunk(nestedDependencies)) {
        if (result.has(dependency)) continue;

        nextDependenciesToCheck.add(dependency);
      }
    }

    if (nextDependenciesToCheck.size === 0) break;

    dependenciesToCheck = nextDependenciesToCheck;
    nextDependenciesToCheck = new Set();
  }

  return Array.from(result);
}
