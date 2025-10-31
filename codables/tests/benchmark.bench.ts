import { deserialize, serialize } from "superjson";

import { bench } from "vitest";
import { coder } from "../Coder";
import { generateData } from "./generate";
import jsonData from "./test-data.json";

const RUN_BENCHMARK = true;

function benchmarkComplexData(name: string, data: any, preserveReferences: boolean = true) {
  const coderEncoded = coder.encode(data);
  const superjsonEncoded = serialize(data);

  const options = { time: 100, iterations: 4 };

  describe(`encode - ${name}`, () => {
    bench(
      "codables",
      () => {
        coder.encode(data, { preserveReferences });
      },
      options,
    );

    bench(
      "superjson",
      () => {
        serialize(data);
      },
      options,
    );
  });

  describe(`decode - ${name}`, () => {
    bench(
      "codables",
      () => {
        coder.decode(coderEncoded);
      },
      options,
    );

    bench(
      "superjson",
      () => {
        deserialize(superjsonEncoded);
      },
      options,
    );
  });

  describe("encode and decode", () => {
    bench(
      "codables",
      () => {
        coder.copy(data);
      },
      options,
    );

    bench(
      "superjson",
      () => {
        deserialize(serialize(data));
      },
      options,
    );
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
