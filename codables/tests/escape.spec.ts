import { decode, encode } from "../Coder";

const SPECIAL_STRINGS = ["$$undefined", "$$NaN", "$$-0", "$$Infinity", "$$-Infinity"] as const;

describe("escape", () => {
  it("should escape special strings", () => {
    for (const string of SPECIAL_STRINGS) {
      expect(encode(string)).toEqual(`~${string}`);
      expect(encode(`~${string}`)).toEqual(`~~${string}`);
      expect(encode(`~~${string}`)).toEqual(`~~~${string}`);

      expect(decode(`~${string}`)).toEqual(string);
      expect(decode(`~~${string}`)).toEqual(`~${string}`);
      expect(decode(`~~~${string}`)).toEqual(`~~${string}`);
    }
  });

  it("should not escape regular strings looking like special strings", () => {
    expect(encode("$$foo")).toEqual("$$foo");
    expect(decode("$$foo")).toEqual("$$foo");

    expect(encode("~$$foo")).toEqual("~$$foo");
    expect(decode("~$$foo")).toEqual("~$$foo");

    expect(encode("~~$$foo")).toEqual("~~$$foo");
    expect(decode("~~$$foo")).toEqual("~~$$foo");

    expect(encode("~~~$$foo")).toEqual("~~~$$foo");
    expect(decode("~~~$$foo")).toEqual("~~~$$foo");
  });
});
