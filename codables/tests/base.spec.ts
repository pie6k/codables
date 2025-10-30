import { Coder, defaultCoder, encode } from "../Coder";

import { JSONValue } from "../types";
import { captureWarnings } from "./testUtils";

function createUInt8Array(length: number) {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = i % 256;
  }
  return array;
}

function expectSerializeAndDeserialize(value: unknown, encodedShape?: JSONValue) {
  const encoded = defaultCoder.encode(value);
  if (encodedShape) {
    expect(encoded).toEqual(encodedShape);
  }
  const decoded = defaultCoder.decode(encoded);
  expect(decoded).toEqual(value);
}

describe("basic", () => {
  it("works", () => {
    const date = new Date("2025-01-01T00:00:00.000Z");
    const foo = encode(date);

    expect(foo).toEqual({ $$Date: "2025-01-01T00:00:00.000Z" });

    // expect(coder.encode(date)).toEqual({ $$date: date.toISOString() });
    // expect(coder.decode({ $$date: date.toISOString() })).toEqual(date);
  });

  it("should encode and decode back properly all basic types", () => {
    expectSerializeAndDeserialize(new Date("2025-01-01T00:00:00.000Z"), {
      $$Date: "2025-01-01T00:00:00.000Z",
    });
    expectSerializeAndDeserialize(new Date("invalid"), { $$Date: null });
    expectSerializeAndDeserialize(Infinity, "$$Infinity");
    expectSerializeAndDeserialize(-Infinity, "$$-Infinity");
    expectSerializeAndDeserialize(0.5);
    expectSerializeAndDeserialize(123n, { $$BigInt: "123" });
    expectSerializeAndDeserialize(BigInt(123), { $$BigInt: "123" });
    expectSerializeAndDeserialize(Symbol.for("foo"), { $$Symbol: "foo" });
    expectSerializeAndDeserialize(Symbol("foo"), { $$Symbol: "foo" });
    expectSerializeAndDeserialize({ foo: undefined }, { foo: "$$undefined" });
    expectSerializeAndDeserialize({
      a: new Int8Array([1, 2]),
      b: new Uint8ClampedArray(3),
    });
    expectSerializeAndDeserialize(undefined, "$$undefined");
    expectSerializeAndDeserialize(null, null);
    expectSerializeAndDeserialize(new URL("https://example.com/"), {
      $$URL: "https://example.com/",
    });

    expectSerializeAndDeserialize({
      a: ["/'a'[0]: string that becomes a regex/"],
      "a.0": /'a.0': regex that becomes a string/,
      "b.0": "/'b.0': string that becomes a regex/",
      "b\\": [/'b\\'[0]: regex that becomes a string/],
    });

    expectSerializeAndDeserialize(-0, "$$-0");

    expectSerializeAndDeserialize(new Float64Array([NaN, 0, NaN, 1]), {
      $$typedArray: {
        type: "float64",
        data: ["$$NaN", 0, "$$NaN", 1],
      },
    });

    expectSerializeAndDeserialize(String("foo"), "foo");
    expectSerializeAndDeserialize(Number(123), 123);
    expectSerializeAndDeserialize(Boolean(true), true);
    expectSerializeAndDeserialize([0, , , 0], [0, "$$undefined", "$$undefined", 0]);

    expectSerializeAndDeserialize(new URLSearchParams("a=1&b=2"), {
      $$URLSearchParams: "a=1&b=2",
    });
  });

  it("should encode nested objects", () => {
    expectSerializeAndDeserialize(new Set([new Date("2025-01-01T00:00:00.000Z")]), {
      $$Set: [{ $$Date: "2025-01-01T00:00:00.000Z" }],
    });
  });
});

describe("custom types", () => {
  it("should encode custom types", () => {
    const coder = new Coder();

    class Foo {
      constructor(public name: string) {}
    }

    coder.addType(
      "Foo",
      (value) => value instanceof Foo,
      (value) => value.name,
      (name) => new Foo(name),
    );

    expect(coder.encode(new Foo("bar"))).toEqual({ $$Foo: "bar" });
    expect(coder.decode({ $$Foo: "bar" })).toEqual(new Foo("bar"));
  });

  it("custom types can have nested custom objects", () => {
    const coder = new Coder();

    class User {
      constructor(readonly logins: Set<Date>) {}
    }

    coder.addType(
      "User",
      (value) => value instanceof User,
      (value) => value.logins,
      (logins) => new User(logins),
    );

    expect(coder.encode(new User(new Set([new Date("2025-01-01T00:00:00.000Z")])))).toEqual({
      $$User: { $$Set: [{ $$Date: "2025-01-01T00:00:00.000Z" }] },
    });
    expect(
      coder.decode({
        $$User: { $$Set: [{ $$Date: "2025-01-01T00:00:00.000Z" }] },
      }),
    ).toEqual(new User(new Set([new Date("2025-01-01T00:00:00.000Z")])));
  });
});

describe("plain json", () => {
  it("serializes to json the same way as normal json", () => {
    const a: JSONValue = [1, 2, 3, { foo: "bar" }, { baz: false, qux: null, quux: true }, { a: 1, b: [4, 5, 6, null] }];

    expect(defaultCoder.encode(a)).toEqual(a);
    expect(defaultCoder.decode(a)).toEqual(a);

    expect(defaultCoder.encode(null)).toEqual(null);
    expect(defaultCoder.decode(true)).toEqual(true);
    expect(defaultCoder.decode(false)).toEqual(false);
    expect(defaultCoder.decode(1)).toEqual(1);
    expect(defaultCoder.decode(2.5)).toEqual(2.5);
    expect(defaultCoder.decode("foo")).toEqual("foo");
    expect(defaultCoder.encode([])).toEqual([]);
    expect(defaultCoder.encode({})).toEqual({});
  });
});

describe("errors", () => {
  it("should throw an error if a type is registered twice", () => {
    const coder = new Coder();

    coder.addType(
      "foo",
      (value) => typeof value === "string",
      (value) => value,
      (value) => value,
    );

    expect(() => {
      coder.addType(
        "foo",
        (value) => typeof value === "string",
        (value) => value,
        (value) => value,
      );
    }).toThrowErrorMatchingInlineSnapshot(`[Error: Other codable type with name "foo" already registered]`);
  });

  it("should include error stack if includeErrorStack is true", () => {
    const error = new Error("foo");
    const encoded: any = defaultCoder.encode(error, { includeErrorStack: true });

    const originalStack = error.stack;

    expect(encoded.$$Error.stack.length).toBeGreaterThan(0);

    const decoded = defaultCoder.decode<typeof error>(encoded);
    expect(decoded.stack).toBe(originalStack);
  });
});

describe("stringify/parse", () => {
  it("should stringify and parse the same way as normal json", () => {
    const a = [1, 2, 3, { foo: "bar" }, { baz: false, qux: null, quux: true }, { a: 1, b: [4, 5, 6, null] }];
    expect(defaultCoder.stringify(a)).toEqual(JSON.stringify(a));
    expect(defaultCoder.parse(defaultCoder.stringify(a))).toEqual(a);
  });

  it("should stringify and parse custom types", () => {
    const coder = new Coder();

    class Foo {
      constructor(public name: string) {}
    }

    coder.addType(
      "Foo",
      (value) => value instanceof Foo,
      (value) => value.name,
      (name) => new Foo(name),
    );
    expect(coder.stringify(new Foo("bar"))).toEqual(JSON.stringify({ $$Foo: "bar" }));
    expect(coder.parse(JSON.stringify({ $$Foo: "bar" }))).toEqual(new Foo("bar"));
  });
});

describe("isDefault", () => {
  it("should return true if the coder is the default coder", () => {
    expect(defaultCoder.isDefault).toBe(true);

    const otherCoder = new Coder();

    expect(otherCoder.isDefault).toBe(false);
  });

  it("should throw an error if a type is registered on the default coder", () => {
    expect(() => {
      defaultCoder.addType(
        "foo",
        (value) => typeof value === "string",
        (value) => value,
        (value) => value,
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot register types on the default coder. Create a custom coder instance using \`new Coder()\` and register types on that instance.]`,
    );
  });
});

describe("dots in paths", () => {
  it("should properly encode and decode paths with dots", () => {
    const foo = { "foo/bar": "baz" };
    const encoded = defaultCoder.encode(foo);

    expect(encoded).toEqual({ "foo/bar": "baz" });
    expect(defaultCoder.decode({ "foo/bar": "baz" })).toEqual(foo);
  });

  it("should properly encode and decode paths with dots in nested objects", () => {
    const foo = { "foo/bar": { "baz/qux": "quux" } };
    const encoded = defaultCoder.encode(foo);

    expect(encoded).toEqual({ "foo/bar": { "baz/qux": "quux" } });
    expect(defaultCoder.decode({ "foo/bar": { "baz/qux": "quux" } })).toEqual(foo);
  });

  it("works if path contains explicit \\", () => {
    const foo = { "foo/bar": "baz" };
    const encoded = defaultCoder.encode(foo);

    expect(encoded).toEqual({ "foo/bar": "baz" });
    expect(defaultCoder.decode({ "foo/bar": "baz" })).toEqual(foo);
  });
});

describe("symbols", () => {
  it("should keep the same symbol reference", () => {
    const symbol = Symbol("foo");
    const input = [symbol, symbol];
    const encoded = defaultCoder.encode(input);
    expect(encoded).toEqual([{ $$Symbol: "foo" }, { $$Symbol: "foo" }]);

    const decoded = defaultCoder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
    expect(decoded[0]).toBe(decoded[1]);
  });

  it("decoded symbol should be the same as the original symbol", () => {
    const fooSymbol = Symbol("foo");
    const barSymbol = Symbol("bar");

    const input = [fooSymbol, barSymbol];
    const encoded = defaultCoder.encode(input);
    const decoded = defaultCoder.decode<typeof input>(encoded);

    expect(decoded[0]).toBe(fooSymbol);
    expect(decoded[1]).toBe(barSymbol);
  });

  it("should work with symbols created with .for", () => {
    const fooSymbol = Symbol.for("createdbefore");

    const decoded = defaultCoder.decode<any>({ $$Symbol: "createdbefore" });

    expect(fooSymbol).toBe(Symbol.for("createdbefore"));
    expect(decoded).toBe(fooSymbol);
  });
});

describe("coding errors", () => {
  it("should encode and decode errors", () => {
    expectSerializeAndDeserialize(new Error("foo"), { $$Error: "foo" });

    expectSerializeAndDeserialize(new Error("foo", { cause: new Error("bar") }), {
      $$Error: { message: "foo", cause: { $$Error: "bar" } },
    });

    const error = new Error("named");
    error.name = "CustomError";

    expectSerializeAndDeserialize(error, {
      $$Error: { message: "named", name: "CustomError" },
    });
  });
});

describe("object with array like keys", () => {
  it("should properly encode and decode object with array like keys", () => {
    const foo = { "0": "bar", "1": "baz" };
    const encoded = defaultCoder.encode(foo);

    expect(encoded).toEqual({ "0": "bar", "1": "baz" });
    expect(defaultCoder.decode({ "0": "bar", "1": "baz" })).toEqual(foo);
  });
});

describe("map with regex keys", () => {
  it("regex map keys", () => {
    const input = new Map([
      [/foo/, "foo"],
      [/foo/, "foo"],
    ]);

    const encoded = defaultCoder.encode(input);

    expect(encoded).toEqual({
      $$Map: [
        [{ $$RegExp: "foo" }, "foo"],
        [{ $$RegExp: "foo" }, "foo"],
      ],
    });

    const decoded = defaultCoder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
  });
});

describe("custom errors", () => {
  it("keeps extra error properties", () => {
    const error = new Error("foo");
    // @ts-expect-error
    error.code = "E_FOO";

    expectSerializeAndDeserialize(error, {
      $$Error: { message: "foo", properties: { code: "E_FOO" } },
    });
  });

  it("should not include error stack", () => {
    const input = new Error("Beep boop, you don't wanna see me. I'm an error!");
    expect(input).toHaveProperty("stack");

    const encoded = defaultCoder.encode(input);

    expect(encoded).toEqual({
      $$Error: "Beep boop, you don't wanna see me. I'm an error!",
    });

    const decoded = defaultCoder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
  });
});

describe("Object.create(null)", () => {
  it("should properly encode and decode Object.create(null)", () => {
    const foo = Object.create(null);
    foo.bar = "baz";
    const encoded = defaultCoder.encode(foo);

    expect(encoded).toEqual(foo);
  });
});

describe("prototype pollution", () => {
  it("handles weird inputs", () => {
    expect(defaultCoder.encode({ constructor: {} })).toStrictEqual({});
  });
});

describe("format collisions", () => {
  it("properly encodes and decodes data that collides with internal format", () => {
    const input = { $$Set: [1, 2, 3] };

    const encoded = defaultCoder.encode(input);

    expect(encoded).toEqual({ "~$$Set": [1, 2, 3] });

    const decoded = defaultCoder.decode<typeof input>(encoded);

    expect(decoded).toEqual(input);
    expect(decoded.$$Set).toEqual([1, 2, 3]);
  });

  it("handles somehow already escaped type keys", () => {
    const input = { "~$$Set": [1, 2, 3] };

    const encoded = defaultCoder.encode(input);

    expect(encoded).toEqual({ "~~$$Set": [1, 2, 3] });

    const decoded = defaultCoder.decode<typeof input>(encoded);

    expect(decoded).toEqual(input);
  });

  it("can re-encode n times and then decode back properly", () => {
    const N = 5;
    const input = { $$Set: [1, 2, 3] };

    let current: any = input;
    for (let i = 0; i < N; i++) {
      current = defaultCoder.encode(current);
    }

    expect(current).toEqual({ "~~~~~$$Set": [1, 2, 3] });

    for (let i = 0; i < N; i++) {
      current = defaultCoder.decode(current);
    }

    expect(current).toEqual(input);
  });

  it("escapes array refs", () => {
    const input = { foo: ["$$id:0", 1, 2, 3] };

    const encoded = defaultCoder.encode(input);

    expect(encoded).toEqual({ foo: ["~$$id:0", 1, 2, 3] });

    const decoded = defaultCoder.decode<typeof input>(encoded);

    expect(decoded).toEqual(input);
  });
});

describe("uncodable handling", () => {
  class UnknownClass {
    constructor(public name: string) {}
  }

  const input = { foo: new UnknownClass("foo") };
  it("null mode", () => {
    expect(defaultCoder.encode(input, { unknownInputMode: "null" })).toEqual({
      foo: null,
    });
  });
  it("unchanged mode", () => {
    const encoded: any = defaultCoder.encode(input, {
      unknownInputMode: "unchanged",
    });

    expect(encoded.foo).toBe(input.foo);
  });
  it("throw mode", () => {
    expect(() => defaultCoder.encode(input, { unknownInputMode: "throw" })).toThrowErrorMatchingInlineSnapshot(
      `[Error: Not able to encode - no matching type found]`,
    );
  });
});

describe("copy", () => {
  it("should copy the value", () => {
    const input = { foo: "bar" };
    const copied = defaultCoder.copy(input);
    expect(copied).toEqual(input);
    expect(copied).not.toBe(input);
  });

  it("should copy nested values, with complex types", () => {
    const input = { foo: new Map([["bar", { bar: "baz" }]]) };
    const copied = defaultCoder.copy<typeof input>(input);
    expect(copied.foo).toEqual(input.foo);
    expect(copied.foo).not.toBe(input.foo);
    expect(copied.foo.get("bar")).toEqual(input.foo.get("bar"));
    expect(copied.foo.get("bar")).not.toBe(input.foo.get("bar"));
  });
});
