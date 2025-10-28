import { deserialize, serialize } from "superjson";

import { bench } from "vitest";
import { defaultCoder } from "../Coder";
import { generateData } from "./generate";
import jsonData from "./test-data.json";

const RUN_BENCHMARK = true;

function benchmarkComplexData(name: string, data: any, preserveReferences: boolean = true) {
  const coderEncoded = defaultCoder.encode(data);
  const superjsonEncoded = serialize(data);

  describe(`encode - ${name}`, () => {
    bench("codables", () => {
      const encoded = defaultCoder.encode(data, { preserveReferences });
    });

    bench("superjson", () => {
      const encoded = serialize(data);
    });
  });

  describe(`decode - ${name}`, () => {
    bench("codables", () => {
      const decoded = defaultCoder.decode(coderEncoded);
    });

    bench("superjson", () => {
      const decoded = deserialize(superjsonEncoded);
    });
  });
}

describe.runIf(RUN_BENCHMARK)("benchmark", () => {
  if (!RUN_BENCHMARK) return;

  describe("plain json", () => {
    benchmarkComplexData("6mb", jsonData, true);
    benchmarkComplexData("6mb (no preserve refs)", jsonData, false);
  });

  describe("complex data", () => {
    const dataSets = {
      small: generateData({ i: 2, j: 3, sameReferences: true }),
      "small (no preserve refs)": generateData({ i: 2, j: 3, sameReferences: true }),
      avg: generateData({ i: 10, j: 10, sameReferences: true }),
      "avg (no preserve refs)": generateData({ i: 10, j: 10, sameReferences: false }),
      large: generateData({ i: 30, j: 20, sameReferences: true }),
      "large (no preserve refs)": generateData({ i: 30, j: 20, sameReferences: false }),
      huge: generateData({ i: 70, j: 60, sameReferences: true }),
      "huge (no preserve refs)": generateData({ i: 70, j: 60, sameReferences: false }),
    };

    for (const [name, data] of Object.entries(dataSets)) {
      const refs = name.includes("no preserve refs") ? false : true;
      benchmarkComplexData(name, data, refs);
    }
  });
});
