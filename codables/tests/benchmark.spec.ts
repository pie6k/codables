import { Coder, defaultCoder } from "../Coder";
import { GenerateDataOptions, generateData } from "./generate";
import { deserialize, serialize } from "superjson";

import { JSONValue } from "../types";
import { copyJSON } from "../utils/json";
import jsonData from "./test-data.json";

const RUN_BENCHMARK = false;

function benchmarkComplexData(name: string, data: any, repeats: number = 10) {
  describe(`${name} (${repeats} repeats)`, () => {
    const coderEncoded = defaultCoder.encode(data);
    const superjsonEncoded = serialize(data);

    it("encode - codables", () => {
      for (let i = 0; i < repeats; i++) {
        const encoded = defaultCoder.encode(data);
      }

      // console.dir(encoded, { depth: null });
    });

    it("encode - superjson", () => {
      for (let i = 0; i < repeats; i++) {
        const encoded = serialize(data);
      }
    });

    it("encode - codables (no preserve references)", () => {
      for (let i = 0; i < repeats; i++) {
        const encoded = defaultCoder.encode(data, {
          preserveReferences: false,
        });
      }

      // console.dir(encoded, { depth: null });
    });

    // console.dir(coderEncoded, { depth: null });

    it("decode - codables", () => {
      for (let i = 0; i < repeats; i++) {
        const decoded = defaultCoder.decode(coderEncoded);
      }
      // expect(decoded).toEqual(data);
    });

    it("decode - superjson", () => {
      for (let i = 0; i < repeats; i++) {
        const decoded = deserialize(superjsonEncoded);
      }
      // expect(decoded).toEqual(data);
    });
  });
}

describe.runIf(RUN_BENCHMARK)("benchmark", () => {
  if (!RUN_BENCHMARK) return;

  describe("json data", () => {
    benchmarkComplexData("big data with no custom types", jsonData, 10);
  });

  describe("complex data", () => {
    benchmarkComplexData("small data [2 x 3]", generateData({ i: 2, j: 3, sameReferences: true }), 500);
    benchmarkComplexData("avg data [10 x 10]", generateData({ i: 10, j: 10, sameReferences: true }), 70);
    benchmarkComplexData(
      "avg data no repeated references [10 x 10]",
      generateData({ i: 10, j: 10, sameReferences: false }),
      70,
    );
    benchmarkComplexData("large data [30 x 20]", generateData({ i: 30, j: 20, sameReferences: true }), 15);
    benchmarkComplexData("huge data [50 x 40]", generateData({ i: 50, j: 40, sameReferences: true }), 3);
  });

  // benchmarkComplexData(true);
});
