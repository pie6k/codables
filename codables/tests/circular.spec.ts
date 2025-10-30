import { Coder, defaultCoder } from "../Coder";

import { JSONValue } from "../types";

describe("circular references", () => {
  it("should encode circular references (top)", () => {
    const foo = { text: "foo", self: null as any };
    foo.self = foo;

    const encoded = defaultCoder.encode(foo);

    expect(encoded).toEqual({
      text: "foo",
      self: { $$ref: "/" },
    });

    const decoded = defaultCoder.decode<any>(encoded);

    expect(decoded).toEqual(foo);
    expect(decoded.self).toBe(decoded);
  });

  it("should encode circular references", () => {
    const foo = { foo: "foo", bar: null as any };
    const bar = { foo: foo };

    foo.bar = bar;

    expect(defaultCoder.encode(foo)).toEqual({
      foo: "foo",
      bar: { foo: { $$ref: "/" } },
    });
  });

  it("should properly encode same level circular references", () => {
    const foo: any = {};
    const bar: any = {};

    foo.bar = bar;
    bar.foo = foo;

    const encoded = defaultCoder.encode([foo, bar]);

    expect(encoded).toEqual([{ bar: { foo: { $$ref: "/0" } } }, { $$ref: "/0/bar" }]);

    const decoded = defaultCoder.decode<any>(encoded);

    expect(decoded).toEqual([foo, bar]);

    const [decodedFoo, decodedBar] = decoded;

    expect(decodedFoo).toEqual(foo);
    expect(decodedBar).toEqual(bar);
    expect(decodedFoo.bar).toBe(decodedBar);
    expect(decodedBar.foo).toBe(decodedFoo);
  });

  it("resolves refs in custom types", () => {
    const foo = { foo: "foo" };

    const input = new Map([
      ["foo", foo],
      ["bar", foo],
    ]);

    const encoded = defaultCoder.encode(input);

    expect(encoded).toEqual({
      $$Map: [
        ["foo", { foo: "foo" }],
        ["bar", { $$ref: "/$$Map/0/1" }],
      ],
    });

    const decoded = defaultCoder.decode<typeof input>(encoded);

    expect(decoded).toEqual(input);
    expect(decoded.get("foo")).toBe(decoded.get("bar"));
  });
});

describe("referential equalities", () => {
  it("should be equal if they are the same object", () => {
    const a = { foo: "foo" };

    const input = [a, a];
    const encoded = defaultCoder.encode(input);
    expect(encoded).toEqual([{ foo: "foo" }, { $$ref: "/0" }]);

    const decoded = defaultCoder.decode<typeof input>(encoded);

    expect(decoded).toEqual([{ foo: "foo" }, { foo: "foo" }]);
    expect(decoded[0]).toBe(decoded[1]);
  });
});

describe("custom types", () => {
  it("should handle circular references in custom types", () => {
    interface Item {
      name: string;
    }

    const itemA: Item = { name: "A" };
    const itemB: Item = { name: "B" };

    class User {
      constructor(public items: Map<string, Item>) {}
    }

    const coder = new Coder();

    coder.addType(
      "User",
      (value) => value instanceof User,
      (value) => value.items,
      (items) => new User(items),
    );

    const user = new User(
      new Map([
        ["A", itemA],
        ["B", itemB],
        ["AA", itemA],
      ]),
    );

    const encoded = coder.encode(user);

    expect(encoded).toEqual({
      $$User: {
        $$Map: [
          ["A", { name: "A" }],
          ["B", { name: "B" }],
          ["AA", { $$ref: "/$$User/$$Map/0/1" }],
        ],
      },
    });

    const decoded = coder.decode<typeof user>(encoded);

    expect(decoded).toEqual(user);
    expect(decoded.items.get("A")).toBe(decoded.items.get("AA"));
  });
});

describe("dots in paths or keys", () => {
  it("should properly solve references with dots in paths or keys", () => {
    const foo = { foo: "foo" };
    const bar = { "bar/bar": [foo, foo] };

    const encoded = defaultCoder.encode(bar);

    expect(encoded).toEqual({
      "bar/bar": [{ foo: "foo" }, { $$ref: "/bar~1bar/0" }],
    });

    const decoded = defaultCoder.decode<typeof bar>(encoded);
    expect(decoded).toEqual(bar);
    expect(decoded["bar/bar"][0]).toBe(decoded["bar/bar"][1]);
  });
});

describe("misc", () => {
  it("keeps reference of arrays", () => {
    const arr = [1, 2, 3];
    const foo = { arr };
    const bar = { arr };

    const input = [foo, bar];
    const encoded = defaultCoder.encode(input);
    expect(encoded).toEqual([{ arr: [1, 2, 3] }, { arr: { $$ref: "/0/arr" } }]);

    const decoded = defaultCoder.decode<typeof input>(encoded);
    expect(decoded).toEqual([foo, foo]);
    expect(decoded[0].arr).toBe(decoded[1].arr);
    expect(decoded[0].arr).toBe(decoded[1].arr);
  });

  it("options identity", () => {
    const option1 = { value: "foo" };
    const option2 = { value: "foo" };

    const select = {
      options: [option1, option2],
      selected: option1,
    };

    const encoded = defaultCoder.encode(select);
    expect(encoded).toEqual({
      options: [{ value: "foo" }, { value: "foo" }],
      selected: { $$ref: "/options/0" },
    });

    const decoded = defaultCoder.decode<typeof select>(encoded);
    expect(decoded).toEqual(select);
    expect(decoded.selected).toBe(decoded.options[0]);
  });

  it("same regex", () => {
    const regex = /foo/;

    const input = [regex, regex];
    const encoded = defaultCoder.encode(input);
    expect(encoded).toEqual([{ $$RegExp: "foo" }, { $$ref: "/0" }]);

    const decoded = defaultCoder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
    expect(decoded[0]).toBe(decoded[1]);
  });
});

describe("preserve references", () => {
  it("should not preserve references if preserveReferences is false", () => {
    const foo = { foo: "foo" };
    const input = [foo, foo];

    const encoded = defaultCoder.encode(input, { preserveReferences: false });
    expect(encoded).toEqual([{ foo: "foo" }, { foo: "foo" }]);

    const decoded = defaultCoder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
    expect(decoded[0]).not.toBe(decoded[1]);
  });
});

describe("directly referenced in set", () => {
  const foo = new Set<any>();
  foo.add(foo);

  const originalValues = [...foo.values()];
  expect(foo).toBe(originalValues[0]);

  const encoded = defaultCoder.encode(foo);
  expect(encoded).toEqual({ $$Set: [{ $$ref: "/" }] });

  const decoded = defaultCoder.decode<typeof foo>(encoded);
  const values = [...decoded.values()];
  // console.log({ values });
  expect(values[0]).not.toBe(null);
  expect(values[0]).toBe(decoded);
});
