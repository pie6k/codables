import { Coder, coder } from "../Coder";

import { JSONValue } from "../types";

function createUInt8Array(length: number) {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = i % 256;
  }
  return array;
}

function expectSerializeAndDeserialize(
  value: unknown,
  encodedShape?: JSONValue
) {
  const encoded = coder.encode(value);
  if (encodedShape) {
    expect(encoded).toEqual(encodedShape);
  }
  const decoded = coder.decode(encoded);
  expect(decoded).toEqual(value);
}

describe("basic", () => {
  it("works", () => {
    const date = new Date("2025-01-01T00:00:00.000Z");
    const foo = coder.encode(date);

    // expect(coder.encode(date)).toEqual({ $$date: date.toISOString() });
    // expect(coder.decode({ $$date: date.toISOString() })).toEqual(date);
  });

  it("should encode a simple object", () => {
    const date = new Date("2025-01-01T00:00:00.000Z");
    const foo = coder.encode(date);

    expect(coder.encode(date)).toEqual({ $$date: date.toISOString() });
    expect(coder.decode({ $$date: date.toISOString() })).toEqual(date);

    expect(coder.encode(/bar/g)).toEqual({ $$regexp: ["bar", "g"] });
    expect(coder.decode({ $$regexp: ["bar", "g"] })).toEqual(/bar/g);

    expect(coder.encode(new Map([["foo", "bar"]]))).toEqual({
      $$map: [["foo", "bar"]],
    });
    expect(coder.decode({ $$map: [["foo", "bar"]] })).toEqual(
      new Map([["foo", "bar"]])
    );

    expect(coder.encode(new Set(["foo", "bar"]))).toEqual({
      $$set: ["foo", "bar"],
    });
    expect(coder.decode({ $$set: ["foo", "bar"] })).toEqual(
      new Set(["foo", "bar"])
    );

    expect(coder.encode([undefined])).toEqual([{ $$undefined: null }]);
    expect(coder.decode([{ $$undefined: null }])).toEqual([undefined]);

    expect(coder.encode(createUInt8Array(10))).toEqual({
      $$typedArray: { type: "uint8", data: Array.from(createUInt8Array(10)) },
    });
    expect(
      coder.decode({
        $$typedArray: { type: "uint8", data: Array.from(createUInt8Array(10)) },
      })
    ).toEqual(createUInt8Array(10));

    expect(coder.encode(NaN)).toEqual({ $$num: "NaN" });
    expect(coder.decode({ $$num: "NaN" })).toEqual(NaN);
  });

  it("more coding examples", () => {
    expectSerializeAndDeserialize(new Date("2025-01-01T00:00:00.000Z"));
    expectSerializeAndDeserialize(NaN, { $$num: "NaN" });
    expectSerializeAndDeserialize(new Date("invalid"), { $$date: null });
    expectSerializeAndDeserialize(Infinity, { $$num: "Infinity" });
    expectSerializeAndDeserialize(-Infinity, { $$num: "-Infinity" });
    expectSerializeAndDeserialize(0.5);
    expectSerializeAndDeserialize(123n, { $$bigInt: "123" });
    expectSerializeAndDeserialize(BigInt(123), { $$bigInt: "123" });
    expectSerializeAndDeserialize(Symbol.for("foo"), { $$symbol: "foo" });
    expectSerializeAndDeserialize(Symbol("foo"), { $$symbol: "foo" });
    expectSerializeAndDeserialize(
      { foo: undefined },
      { foo: { $$undefined: null } }
    );
    expectSerializeAndDeserialize(/bar/g, { $$regexp: ["bar", "g"] });
    expectSerializeAndDeserialize([null, undefined, null]);
    expectSerializeAndDeserialize(new Set([1, 2, 3]));
    expectSerializeAndDeserialize(/foo/g, { $$regexp: ["foo", "g"] });
    expectSerializeAndDeserialize(/foo/, { $$regexp: "foo" });
    expectSerializeAndDeserialize(/foo/gi, { $$regexp: ["foo", "gi"] });
    expectSerializeAndDeserialize({
      a: new Int8Array([1, 2]),
      b: new Uint8ClampedArray(3),
    });
    expectSerializeAndDeserialize(undefined, { $$undefined: null });
    expectSerializeAndDeserialize(null, null);
    expectSerializeAndDeserialize(new URL("https://example.com/"), {
      $$url: "https://example.com/",
    });

    expectSerializeAndDeserialize({
      a: ["/'a'[0]: string that becomes a regex/"],
      "a.0": /'a.0': regex that becomes a string/,
      "b.0": "/'b.0': string that becomes a regex/",
      "b\\": [/'b\\'[0]: regex that becomes a string/],
    });

    expectSerializeAndDeserialize(-0, { $$num: "-0" });
  });

  it("should encode nested objects", () => {
    expect(coder.encode(new Set([new Date("2025-01-01T00:00:00.000Z")])))
      .toMatchInlineSnapshot(`
      {
        "$$set": [
          {
            "$$date": "2025-01-01T00:00:00.000Z",
          },
        ],
      }
    `);
  });

  it("should decode nested objects", () => {
    expect(
      coder.decode({
        $$set: [{ $$date: "2025-01-01T00:00:00.000Z" }],
      })
    ).toEqual(new Set([new Date("2025-01-01T00:00:00.000Z")]));
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
      (name) => new Foo(name)
    );

    expect(coder.encode(new Foo("bar"))).toEqual({
      $$Foo: "bar",
    });
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
      (logins) => new User(logins)
    );

    expect(
      coder.encode(new User(new Set([new Date("2025-01-01T00:00:00.000Z")])))
    ).toEqual({
      $$User: { $$set: [{ $$date: "2025-01-01T00:00:00.000Z" }] },
    });
    expect(
      coder.decode({
        $$User: { $$set: [{ $$date: "2025-01-01T00:00:00.000Z" }] },
      })
    ).toEqual(new User(new Set([new Date("2025-01-01T00:00:00.000Z")])));
  });
});

describe("plain json", () => {
  it("serializes to json the same way as normal json", () => {
    const a: JSONValue = [
      1,
      2,
      3,
      { foo: "bar" },
      { baz: false, qux: null, quux: true },
      { a: 1, b: [4, 5, 6, null] },
    ];

    expect(coder.encode(a)).toEqual(a);
    expect(coder.decode(a)).toEqual(a);

    expect(coder.encode(null)).toEqual(null);
    expect(coder.decode(true)).toEqual(true);
    expect(coder.decode(false)).toEqual(false);
    expect(coder.decode(1)).toEqual(1);
    expect(coder.decode(2.5)).toEqual(2.5);
    expect(coder.decode("foo")).toEqual("foo");
    expect(coder.encode([])).toEqual([]);
    expect(coder.encode({})).toEqual({});
  });
});

describe("errors", () => {
  it("should throw an error if a type is registered twice", () => {
    const coder = new Coder();

    coder.addType(
      "foo",
      (value) => typeof value === "string",
      (value) => value,
      (value) => value
    );

    expect(() => {
      coder.addType(
        "foo",
        (value) => typeof value === "string",
        (value) => value,
        (value) => value
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Coder type "foo" already registered]`
    );
  });
});

describe("stringify/parse", () => {
  it("should stringify and parse the same way as normal json", () => {
    const a = [
      1,
      2,
      3,
      { foo: "bar" },
      { baz: false, qux: null, quux: true },
      { a: 1, b: [4, 5, 6, null] },
    ];
    expect(coder.stringify(a)).toEqual(JSON.stringify(a));
    expect(coder.parse(coder.stringify(a))).toEqual(a);
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
      (name) => new Foo(name)
    );
    expect(coder.stringify(new Foo("bar"))).toEqual(
      JSON.stringify({ $$Foo: "bar" })
    );
    expect(coder.parse(JSON.stringify({ $$Foo: "bar" }))).toEqual(
      new Foo("bar")
    );
  });
});

describe("isDefault", () => {
  it("should return true if the coder is the default coder", () => {
    expect(coder.isDefault).toBe(true);

    const otherCoder = new Coder();

    expect(otherCoder.isDefault).toBe(false);
  });

  it("should throw an error if a type is registered on the default coder", () => {
    expect(() => {
      coder.addType(
        "foo",
        (value) => typeof value === "string",
        (value) => value,
        (value) => value
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot register types on the default coder. Create a custom coder instance using \`new Coder()\` and register types on that instance.]`
    );
  });
});

describe("dots in paths", () => {
  it("should properly encode and decode paths with dots", () => {
    const foo = { "foo.bar": "baz" };
    const encoded = coder.encode(foo);

    expect(encoded).toEqual({ "foo\\.bar": "baz" });
    expect(coder.decode({ "foo\\.bar": "baz" })).toEqual(foo);
  });

  it("should properly encode and decode paths with dots in nested objects", () => {
    const foo = { "foo.bar": { "baz.qux": "quux" } };
    const encoded = coder.encode(foo);

    expect(encoded).toEqual({ "foo\\.bar": { "baz\\.qux": "quux" } });
    expect(coder.decode({ "foo\\.bar": { "baz\\.qux": "quux" } })).toEqual(foo);
  });

  it("works if path contains explicit \\", () => {
    const foo = { "foo\\bar": "baz" };
    const encoded = coder.encode(foo);

    expect(encoded).toEqual({ "foo\\bar": "baz" });
    expect(coder.decode({ "foo\\bar": "baz" })).toEqual(foo);
  });
});

describe("symbols", () => {
  it("should keep the same symbol reference", () => {
    const symbol = Symbol("foo");
    const input = [symbol, symbol];
    const encoded = coder.encode(input);
    expect(encoded).toEqual([{ $$symbol: "foo" }, { $$symbol: "foo" }]);

    const decoded = coder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
    expect(decoded[0]).toBe(decoded[1]);
  });

  it("decoded symbol should be the same as the original symbol", () => {
    const fooSymbol = Symbol("foo");
    const barSymbol = Symbol("bar");

    const input = [fooSymbol, barSymbol];
    const encoded = coder.encode(input);
    const decoded = coder.decode<typeof input>(encoded);

    expect(decoded[0]).toBe(fooSymbol);
    expect(decoded[1]).toBe(barSymbol);
  });

  it("should work with symbols created with .for", () => {
    const fooSymbol = Symbol.for("createdbefore");

    const decoded = coder.decode<any>({ $$symbol: "createdbefore" });

    expect(fooSymbol).toBe(Symbol.for("createdbefore"));
    expect(decoded).toBe(fooSymbol);
  });
});

describe("coding errors", () => {
  it("should encode and decode errors", () => {
    expectSerializeAndDeserialize(new Error("foo"), {
      $$error: "foo",
    });

    expectSerializeAndDeserialize(
      new Error("foo", { cause: new Error("bar") }),
      {
        $$error: {
          message: "foo",
          cause: {
            $$error: "bar",
          },
        },
      }
    );

    const error = new Error("named");
    error.name = "CustomError";

    expectSerializeAndDeserialize(error, {
      $$error: { message: "named", name: "CustomError" },
    });
  });
});

describe("object with array like keys", () => {
  it("should properly encode and decode object with array like keys", () => {
    const foo = { "0": "bar", "1": "baz" };
    const encoded = coder.encode(foo);

    expect(encoded).toEqual({ "0": "bar", "1": "baz" });
    expect(coder.decode({ "0": "bar", "1": "baz" })).toEqual(foo);
  });
});

describe("map with regex keys", () => {
  it("regex map keys", () => {
    const input = new Map([
      [/foo/, "foo"],
      [/foo/, "foo"],
    ]);

    const encoded = coder.encode(input);

    expect(encoded).toEqual({
      $$map: [
        [{ $$regexp: "foo" }, "foo"],
        [{ $$regexp: "foo" }, "foo"],
      ],
    });

    const decoded = coder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
  });
});

describe("custom errors", () => {
  it("keeps extra error properties", () => {
    const error = new Error("foo");
    // @ts-expect-error
    error.code = "E_FOO";

    expectSerializeAndDeserialize(error, {
      $$error: { message: "foo", properties: { code: "E_FOO" } },
    });
  });

  it("should not include error stack", () => {
    const input = new Error("Beep boop, you don't wanna see me. I'm an error!");
    expect(input).toHaveProperty("stack");

    const encoded = coder.encode(input);

    expect(encoded).toEqual({
      $$error: "Beep boop, you don't wanna see me. I'm an error!",
    });

    const decoded = coder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
  });
});

describe("Object.create(null)", () => {
  it("should properly encode and decode Object.create(null)", () => {
    const foo = Object.create(null);
    foo.bar = "baz";
    const encoded = coder.encode(foo);

    expect(encoded).toEqual(foo);
  });
});

describe("prototype pollution", () => {
  it("handles weird inputs", () => {
    expect(coder.encode({ constructor: {} })).toStrictEqual({});
  });
});

describe("format collisions", () => {
  it("properly encodes and decodes data that collides with internal format", () => {
    const input = { $$set: [1, 2, 3] };

    const encoded = coder.encode(input);

    expect(encoded).toEqual({ "\\$$set": [1, 2, 3] });

    const decoded = coder.decode<typeof input>(encoded);

    expect(decoded).toEqual(input);
    expect(decoded.$$set).toEqual([1, 2, 3]);
  });

  it("handles somehow already escaped type keys", () => {
    const input = { "\\$$set": [1, 2, 3] };

    const encoded = coder.encode(input);

    expect(encoded).toEqual(input);

    const decoded = coder.decode<typeof input>(encoded);

    expect(decoded).toEqual(input);
  });
});
