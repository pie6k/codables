import { CodableType, getIsCodableType } from "./CodableType";
import { Thunk, resolveThunk } from "./utils/misc";

import { AnyClass } from "./decorators/types";
import { getCodableClassType } from "./decorators/registry";
import { getIsNotNull } from "./is";

export type CodableDependency = AnyClass | CodableType;

export type CodableDependencies = Thunk<CodableDependency[]>;

function resolveDependency(dependency: CodableDependency): CodableType | null {
  if (getIsCodableType(dependency)) return dependency;

  const codableClassType = getCodableClassType(dependency);

  if (!codableClassType) return null;

  return codableClassType;
}

function getDirectDependencies(dependency: CodableDependency): CodableDependency[] | null {
  if (getIsCodableType(dependency)) {
    return resolveThunk(dependency.dependencies);
  }

  const codableClassType = getCodableClassType(dependency);

  if (!codableClassType) return null;

  return resolveThunk(codableClassType.dependencies);
}

function addToSet<T>(source: Set<T>, values: Iterable<T>) {
  for (const value of values) {
    source.add(value);
  }
}

export function resolveCodableDependencies(dependency: CodableDependency): Set<CodableType> {
  const resolvedDependencies: Set<CodableDependency> = new Set();

  let dependenciesToCheck = new Set<CodableDependency>([dependency]);

  while (true) {
    if (dependenciesToCheck.size === 0) break;

    for (const dependency of dependenciesToCheck) {
      dependenciesToCheck.delete(dependency);

      if (resolvedDependencies.has(dependency)) continue;
      resolvedDependencies.add(dependency);

      const nestedDependencies = getDirectDependencies(dependency);

      if (!nestedDependencies) continue;

      addToSet(resolvedDependencies, nestedDependencies);
      addToSet(dependenciesToCheck, nestedDependencies);
    }
  }

  resolvedDependencies.delete(dependency);

  const resolvedTypes = Array.from(resolvedDependencies).map(resolveDependency).filter(getIsNotNull);

  return new Set(resolvedTypes);
}
