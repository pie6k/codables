import { JSONArray, JSONObject, JSONValue } from "./types";

import { getIsRecord } from "./is";

export function getIsNestedJSON(
  input: unknown
): input is JSONObject | JSONArray {
  return Array.isArray(input) || getIsRecord(input);
}

export function* iterateNestedJSON(json: JSONObject | JSONArray) {
  if (Array.isArray(json)) {
    for (const [index, item] of json.entries()) {
      yield [index.toString(), item] as const;
    }

    return;
  }

  for (const [key, value] of Object.entries(json)) {
    yield [key, value] as const;
  }
}
