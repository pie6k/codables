import { DecodeContext } from "../DecodeContext";
import { defaultCoder } from "../Coder";

describe("misc", () => {
  it("encodes function as null", () => {
    const foo = () => "foo";
    const encoded = defaultCoder.encode(foo);
    expect(encoded).toEqual(null);
    const decoded = defaultCoder.decode<typeof foo>(encoded);
    expect(decoded).toBe(null);
  });
});

describe("DecodeContext", () => {
  it("works with refs inside custom types", () => {
    const context = new DecodeContext({
      $$map: [
        ["foo", { foo: "foo" }],
        ["bar", { $$ref: "/$$map/0/1" }],
      ],
    });

    expect(context.hasCustomTypes).toBe(true);
    expect(context.hasRefAliases).toBe(true);
    expect(context.presentRefAliases.has("/$$map/0/1")).toBe(true);
    expect(context.presentRefAliases).toEqual(new Set(["/$$map/0/1"]));
  });

  it("works with custom types, but no refs", () => {
    const context = new DecodeContext({ $$map: [["foo", { foo: "foo" }]] });

    expect(context.hasCustomTypes).toBe(true);
    expect(context.hasRefAliases).toBe(false);
  });
});

describe("POJO with symbol key", () => {
  it("should ignore symbol keys", () => {
    const foo = { [Symbol("foo")]: "foo" };
    const encoded = defaultCoder.encode(foo);
    expect(encoded).toEqual({});
    const decoded = defaultCoder.decode<typeof foo>(encoded);
    expect(decoded).toEqual({});
  });
});

describe("primitive objects", () => {
  it("String", () => {
    const input = String("foo");
    const encoded = defaultCoder.encode(input);
    expect(encoded).toEqual("foo");
    const decoded = defaultCoder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
  });
});
