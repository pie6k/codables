import { JSONArray, JSONObject, JSONValue } from "../types";

import { getIsForbiddenProperty } from "./security";
import { getIsRecord } from "../is";

export function copyJSON(json: JSONValue): JSONValue {
  if (Array.isArray(json)) {
    const result: JSONArray = [];

    for (let index = 0; index < json.length; index++) {
      result[index] = copyJSON(json[index]);
    }

    return result;
  } else if (getIsRecord(json)) {
    const result: JSONObject = {};

    for (const key of Object.keys(json)) {
      if (getIsForbiddenProperty(key)) continue;

      result[key] = copyJSON(json[key]);
    }

    return result;
  }

  return json;
}
