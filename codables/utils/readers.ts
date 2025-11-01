function getIsIndexInBounds(index: number, length: number): boolean {
  return index >= 0 && index < length;
}

function getNthFromIterable<T>(target: Iterable<T>, index: number): T {
  let i = 0;
  for (const item of target) {
    if (i === index) return item;
    i++;
  }

  throw new Error(`Index out of bounds: ${index}`);
}

export function setInSetAtIndex(set: Set<unknown>, index: number, value: unknown) {
  if (!getIsIndexInBounds(index, set.size)) return false;

  const values = [...set];
  values[index] = value;

  set.clear();

  for (const item of values) {
    set.add(item);
  }

  return true;
}

export function getInSetAtIndex<T>(target: Set<T>, index: number): T {
  if (!getIsIndexInBounds(index, target.size)) throw new Error(`Index out of bounds: ${index}`);

  return getNthFromIterable(target.values(), index);
}

export function updateMapValueByIndex(map: Map<unknown, unknown>, index: number, newValue: unknown) {
  const entry = getMapEntryByIndex(map, index);

  map.set(entry[EntryIndex.Key], newValue);
  return true;
}

export function updateMapKeyByIndex(map: Map<unknown, unknown>, index: number, newValue: unknown) {
  const entries = [...map.entries()];

  if (!getIsIndexInBounds(index, entries.length)) return false;

  entries[index][EntryIndex.Key] = newValue;

  map.clear();

  for (const [key, value] of entries) {
    map.set(key, value);
  }

  return true;
}

function getMapEntryByIndex<K, V>(map: Map<K, V>, entryIndex: number): [K, V] {
  if (!getIsIndexInBounds(entryIndex, map.size)) throw new Error(`Index out of bounds: ${entryIndex}`);

  return getNthFromIterable(map.entries(), entryIndex);
}

export function getMapValueByIndex(map: Map<unknown, unknown>, entryIndex: number) {
  return getMapEntryByIndex(map, entryIndex)[EntryIndex.Value];
}

export function getMapKeyByIndex(map: Map<unknown, unknown>, entryIndex: number) {
  return getMapEntryByIndex(map, entryIndex)[EntryIndex.Key];
}

export enum EntryIndex {
  Key = 0,
  Value = 1,
}
