import { Thunk, resolveThunk } from "../utils/misc";

import { AnyClass } from "./types";

export type CodableClassDependencies = Thunk<AnyClass[]>;

const dependenciesRegistry = new WeakMap<AnyClass, CodableClassDependencies>();

export function registerCodableClassDependencies<T extends AnyClass>(
  Class: T,
  dependencies: CodableClassDependencies,
) {
  if (dependenciesRegistry.has(Class)) {
    throw new Error(
      `Codable class "${Class.name}" already registered dependencies`,
    );
  }

  dependenciesRegistry.set(Class, dependencies);
}

export function resolveCodableClassDependencies<T extends AnyClass>(
  Class: T,
): AnyClass[] {
  const result: Set<AnyClass> = new Set();

  let dependenciesToCheck = new Set<AnyClass>([Class]);
  let nextDependenciesToCheck = new Set<AnyClass>();

  while (true) {
    for (const dependency of dependenciesToCheck) {
      if (result.has(dependency)) continue;
      result.add(dependency);
      const nestedDependencies = dependenciesRegistry.get(dependency);

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
