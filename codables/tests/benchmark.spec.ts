import { deserialize, serialize } from "superjson";

import { Coder } from "../Coder";
import { JSONValue } from "../types";
import data from "./test-data.json";
import { jsonBaselineTraverse } from "./testUtils";

describe("benchmark", () => {
  it("codables", () => {
    const coder = new Coder();
    const encoded = coder.encode(data);
    // const decoded = coder.decode(encoded);
    // expect(decoded).toEqual(data);
  });

  it("superjson", () => {
    const encoded = serialize(data);
    // const decoded = deserialize(encoded);
    // expect(decoded).toEqual(data);
  });

  it("json", () => {
    const encoded = JSON.stringify(data);
    const decoded = JSON.parse(encoded);
    // expect(decoded).toEqual(data);
  });

  it("baseline", () => {
    const encoded = jsonBaselineTraverse(data as JSONValue);
    // const decoded = JSON.parse(encoded);
    // expect(decoded).toEqual(data);
  });
});
