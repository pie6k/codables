import { Coder, defaultCoder } from "../Coder";
import { deserialize, serialize } from "superjson";

import { JSONValue } from "../types";
import { copyJSON } from "../utils/json";
import data from "./test-data.json";
import { generateData } from "./generate";

const RUN_BENCHMARK = true;

function testComplexData(sameReferences: boolean) {
  describe(`complex data ${sameReferences ? "with" : "without"} same references`, () => {
    describe("encode", () => {
      const data = generateData({ sameReferences });
      it("codables", () => {
        const encoded = defaultCoder.encode(data);

        // console.dir(encoded, { depth: null });
      });

      it("codables (no preserve references)", () => {
        const encoded = defaultCoder.encode(data, {
          preserveReferences: false,
        });

        // console.dir(encoded, { depth: null });
      });

      it("superjson", () => {
        const encoded = serialize(data);
      });
    });

    describe("decode", () => {
      const data = generateData({ sameReferences });

      const coderEncoded = defaultCoder.encode(data);
      const superjsonEncoded = serialize(data);

      // console.dir(coderEncoded, { depth: null });

      it("codables", () => {
        const decoded = defaultCoder.decode(coderEncoded);
        // expect(decoded).toEqual(data);
      });

      it("superjson", () => {
        const decoded = deserialize(superjsonEncoded);
        // expect(decoded).toEqual(data);
      });
    });
  });
}

describe.runIf(RUN_BENCHMARK)("benchmark", () => {
  if (!RUN_BENCHMARK) return;

  describe("standard, big json", () => {
    describe("encode", () => {
      const coder = new Coder();
      it("codables", () => {
        const encoded = coder.encode(data);
        // console.dir(encoded, { depth: null });
      });

      it("codables (no preserve references)", () => {
        const encoded = coder.encode(data, { preserveReferences: false });
        // console.dir(encoded, { depth: null });
      });

      it("superjson", () => {
        const encoded = serialize(data);
      });

      it("json.stringify", () => {
        const encoded = JSON.stringify(data);
      });

      it("copy", () => {
        const encoded = copyJSON(data as JSONValue);
      });
    });

    describe("decode", () => {
      const coder = new Coder();
      const coderEncoded = coder.encode(data);
      const superjsonEncoded = serialize(data);
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

  testComplexData(false);
  testComplexData(true);
});
