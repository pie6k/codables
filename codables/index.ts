export { Coder, encode, decode, parse, stringify } from "./Coder";
export { codableClass } from "./decorators/codableClass";
export { codable } from "./decorators/codable";
export { createCodableType, getIsCodableType, CodableType } from "./CodableType";
export type { Memberwise, MemberwiseExclude } from "./decorators";

const foo = {
  date: { $$Date: "2025-01-01T00:00:00.000Z" },
  regexp: { $$RegExp: ["hello world", "gi"] },
  error: {
    $$Error: { message: "Something went wrong", cause: 404 },
  },
  url: { $$URL: "https://example.com/path?query=value" },
  urlSearchParams: { $$URLSearchParams: "query=value&another=value" },
  bigint: { $$BigInt: "1234567890123456789" },
  symbol: { $$Symbol: "test" },
  undefined: { $$undefined: null },
  specialNumbers: [{ $$num: "Infinity" }, { $$num: "-Infinity" }, { $$num: "-0" }, { $$num: "NaN" }],
  someData: { $$typedArray: { type: "uint8", data: [1, 2, 3, 4, 5] } },
  set: { $$Set: [1, 2, 3] },
  map: {
    $$Map: [
      [1, 1],
      [2, 2],
    ],
  },
  sameRefs: [{ foo: 1 }, { $$ref: "/sameRefs/0" }, { $$ref: "/sameRefs/0" }],
  sparsedArray: [0, { $$undefined: null }, { $$undefined: null }, 0],
};
