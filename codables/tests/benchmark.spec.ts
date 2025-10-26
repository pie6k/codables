import { Coder, coder } from "../Coder";
import { deserialize, serialize } from "superjson";

import { JSONValue } from "../types";
import { copyJSON } from "../utils/json";
import data from "./test-data.json";
import { generateData } from "./generate";

const RUN_BENCHMARK = true;

describe.runIf(RUN_BENCHMARK)("benchmark", () => {
  if (!RUN_BENCHMARK) return;

  describe("plain json", () => {
    describe("encode", () => {
      const coder = new Coder();
      it("codables", () => {
        const encoded = coder.encode(data);
        // console.dir(encoded, { depth: null });
      });

      it("superjson", () => {
        const encoded = serialize(data);
      });

      it("json", () => {
        const encoded = JSON.stringify(data);
      });

      it("clone", () => {
        const encoded = copyJSON(data as JSONValue);
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

    describe("cycle", () => {
      it("codables", () => {
        const encoded = coder.encode(data);
        const decoded = coder.decode(encoded);
      });

      it("superjson", () => {
        const encoded = serialize(data);
        const decoded = deserialize(encoded);
      });
    });
  });

  describe("complex data", () => {
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

    describe("cycle", () => {
      const data = generateData();
      it("codables", () => {
        const coder = new Coder();
        const encoded = coder.encode(data);
        const decoded = coder.decode(encoded);
      });

      it("superjson", () => {
        const encoded = serialize(data);
        const decoded = deserialize(encoded);
      });
    });
  });
});
