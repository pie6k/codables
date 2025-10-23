import { Coder, coder } from "./Coder";
import { describe, expect, it } from "vitest";

import { JSONValue } from "./types";

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

describe("circular references", () => {
  it("should encode circular references (top)", () => {
    const foo = { text: "foo", self: null as any };
    foo.self = foo;

    expect(coder.encode(foo)).toEqual({
      "$$ref:0": {
        text: "foo",
        self: { $$ref: 0 },
      },
    });
  });

  it("should encode circular references", () => {
    const foo = { foo: "foo", bar: null as any };
    const bar = { foo: foo };

    foo.bar = bar;

    expect(coder.encode(foo)).toEqual({
      "$$ref:0": {
        foo: "foo",
        bar: { foo: { $$ref: 0 } },
      },
    });
  });

  it.todo("should properly encode same level circular references", () => {
    const foo: any = {};
    const bar: any = {};

    foo.bar = bar;
    bar.foo = foo;

    expect(coder.encode([foo, bar])).toEqual([{ $$ref: 0 }, { $$ref: 1 }]);
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
