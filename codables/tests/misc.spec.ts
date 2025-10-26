import { DecodeContext } from "../DecodeContext";
import { coder } from "../Coder";

describe("escaped type keys", () => {
  it("should escape type keys", () => {});
});

describe("DecodeContext", () => {
  it("works with refs inside custom types", () => {
    const context = new DecodeContext([
      "$$map",
      [
        ["foo", { foo: "foo" }],
        ["bar", ["$$ref", "/$$map/0/1"]],
      ],
    ]);

    expect(context.hasCustomTypes).toBe(true);
    expect(context.hasRefAliases).toBe(true);
    expect(context.getIsAliasPresent("/$$map/0/1")).toBe(true);
    expect(context.presentRefAliases).toEqual(new Set(["/$$map/0/1"]));
  });

  it("works with custom types, but no refs", () => {
    const context = new DecodeContext(["$$map", [["foo", { foo: "foo" }]]]);

    expect(context.hasCustomTypes).toBe(true);
    expect(context.hasRefAliases).toBe(false);
  });
});

describe("POJO with symbol key", () => {
  it("should ignore symbol keys", () => {
    const foo = { [Symbol("foo")]: "foo" };
    const encoded = coder.encode(foo);
    expect(encoded).toEqual({});
    const decoded = coder.decode<typeof foo>(encoded);
    expect(decoded).toEqual({});
  });
});
