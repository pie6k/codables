import { JSONValue } from "../types";

export function* iterateJSON(json: JSONValue): Generator<JSONValue> {
  if (Array.isArray(json)) {
    for (const item of json) {
      yield* iterateJSON(item);
    }
  } else if (typeof json === "object" && json !== null) {
    for (const [key, value] of Object.entries(json)) {
      yield* iterateJSON(value);
    }
  }
}

type IterateResult = void | false;

export function iterateJSONWithCallback(
  json: JSONValue,
  callback: (json: JSONValue, key: string) => IterateResult
): void | false {
  if (typeof json === "object" && json !== null) {
    for (const [key, value] of Object.entries(json)) {
      if (callback(value, key) === false) return;
      if (iterateJSONWithCallback(value, callback) === false) return;
    }
  } else if (Array.isArray(json)) {
    for (const [index, item] of json.entries()) {
      if (callback(item, index.toString()) === false) return;
      if (iterateJSONWithCallback(item, callback) === false) return;
    }
  }
}
