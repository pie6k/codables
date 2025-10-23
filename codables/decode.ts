import { Coder } from "./Coder";
import { JSONValue } from "./types";
import { getIsRecord } from "./is";
import { parseMaybeCircularRefInfo } from "./refs";
import { sanitizePath } from "./utils";

type CircularRefsMap = Map<number, unknown>;

export function decodeInput<T>(
  input: JSONValue,
  circularRefsMap: CircularRefsMap,
  coder: Coder,
  path: string[]
): T {
  const maybeCustomTypeWrapper = coder.parseMaybeCustomTypeWrapper(input);

  if (maybeCustomTypeWrapper) {
    const decodedData = decodeInput(
      maybeCustomTypeWrapper.data,
      circularRefsMap,
      coder,
      path
    );

    return maybeCustomTypeWrapper.type.decoder(decodedData) as T;
  }

  const maybeCircularRefInfo = parseMaybeCircularRefInfo(input);

  if (maybeCircularRefInfo) {
    if (maybeCircularRefInfo.type === "source") {
      circularRefsMap.set(maybeCircularRefInfo.id, maybeCircularRefInfo.source);
    }

    if (maybeCircularRefInfo.type === "alias") {
      // TODO: Validate
      return circularRefsMap.get(maybeCircularRefInfo.id)! as T;
    }
  }

  if (Array.isArray(input)) {
    const result: unknown[] = [];
    for (const [index, item] of input.entries()) {
      result[index] = decodeInput(item, circularRefsMap, coder, [
        ...path,
        index.toString(),
      ]);
    }
    return result as T;
  }

  if (getIsRecord(input)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = decodeInput(value, circularRefsMap, coder, [...path, key]);
    }
    return result as T;
  }

  return input as T;
}
