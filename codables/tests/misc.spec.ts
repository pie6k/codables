import { DecodeContext } from "../DecodeContext";
import { coder } from "../Coder";

describe("misc", () => {
  it("encodes function as null", () => {
    const foo = () => "foo";
    const encoded = coder.encode(foo);
    expect(encoded).toEqual(null);
    const decoded = coder.decode<typeof foo>(encoded);
    expect(decoded).toBe(null);
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

describe("primitive objects", () => {
  it("String", () => {
    const input = String("foo");
    const encoded = coder.encode(input);
    expect(encoded).toEqual("foo");
    const decoded = coder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
  });
});
