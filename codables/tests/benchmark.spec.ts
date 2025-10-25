import { Coder, coder } from "../Coder";
import { deserialize, serialize } from "superjson";
import { iterateJSON, iterateJSONWithCallback } from "../utils/json";
import { jsonBaselineClone, jsonBaselineTraverse } from "./testUtils";

import { JSONValue } from "../types";
import data from "./test-data.json";
import { generateData } from "./generate";

describe("benchmark", () => {
  describe("encode", () => {
    const coder = new Coder();
    it("codables", () => {
      const encoded = coder.encode(data);
    });

    it("superjson", () => {
      const encoded = serialize(data);
    });
  });

  describe("decode", () => {
    const coder = new Coder();
    const coderEncoded = coder.encode(data);
    const superjsonEncoded = serialize(data);
    it("codables", () => {
      const decoded = coder.decode(coderEncoded);
    });

    it("superjson", () => {
      const decoded = deserialize(superjsonEncoded);
    });
  });

  it("json", () => {
    const encoded = JSON.stringify(data);
    const decoded = JSON.parse(encoded);
    // expect(decoded).toEqual(data);
  });

  it("baseline", () => {
    const encoded = jsonBaselineClone(data as JSONValue);
    // const decoded = JSON.parse(encoded);
    // expect(decoded).toEqual(data);
  });

  it("baseline traverse", () => {
    jsonBaselineTraverse(data as JSONValue);
  });

  it("iterate JSON", () => {
    for (const item of iterateJSON(data as JSONValue)) {
      // console.log(item);
    }
  });

  it("iterate JSON with callback", () => {
    iterateJSONWithCallback(data as JSONValue, (item) => {
      // console.log(item);
    });
  });

  describe("complex", () => {
    describe("encode", () => {
      const data = generateData();
      it("codables", () => {
        const coder = new Coder();
        const encoded = coder.encode(data);
      });

      it("superjson", () => {
        const encoded = serialize(data);
      });
    });

    describe("decode", () => {
      const data = generateData();

      const coderEncoded = coder.encode(data);
      const superjsonEncoded = serialize(data);

      // console.dir(coderEncoded, { depth: null });

      it("codables", () => {
        const decoded = coder.decode(coderEncoded);
        // expect(decoded).toEqual(data);
      });

      it("superjson", () => {
        const decoded = deserialize(superjsonEncoded);
        // expect(decoded).toEqual(data);
      });
    });
  });
});
