import { Coder, coder } from "../Coder";

describe("circular references", () => {
  it("should encode circular references 1", () => {
    const foo = { text: "foo", self: null as any };
    foo.self = foo;

    const encoded = coder.encode(foo);

    expect(encoded).toEqual({
      $$id: 0,
      text: "foo",
      self: { $$ref: 0 },
    });

    const decoded = coder.decode<any>(encoded);

    expect(decoded).toEqual(foo);
    expect(decoded.self).toBe(decoded);
  });

  it("should encode circular references 2", () => {
    const foo = { foo: "foo", bar: null as any };
    const bar = { foo: foo };

    foo.bar = bar;

    expect(coder.encode(foo)).toEqual({
      $$id: 0,
      foo: "foo",
      bar: { foo: { $$ref: 0 } },
    });
  });

  it("should properly encode same level circular references", () => {
    const foo: any = {};
    const bar: any = {};

    foo.bar = bar;
    bar.foo = foo;

    const encoded = coder.encode([foo, bar]);

    expect(encoded).toEqual([
      {
        $$id: 0,
        bar: {
          $$id: 1,
          foo: { $$ref: 0 },
        },
      },
      { $$ref: 1 },
    ]);

    const decoded = coder.decode<any>(encoded);

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

    const encoded = coder.encode(input);

    expect(encoded).toEqual({
      $$Map: [
        ["foo", { $$id: 0, foo: "foo" }],
        ["bar", { $$ref: 0 }],
      ],
    });

    const decoded = coder.decode<typeof input>(encoded);

    expect(decoded).toEqual(input);
    expect(decoded.get("foo")).toBe(decoded.get("bar"));
  });
});

describe("referential equalities", () => {
  it("should be equal if they are the same object", () => {
    const a = { foo: "foo" };

    const input = [a, a];
    const encoded = coder.encode(input);
    expect(encoded).toEqual([
      {
        $$id: 0,
        foo: "foo",
      },
      { $$ref: 0 },
    ]);

    const decoded = coder.decode<typeof input>(encoded);

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
          ["A", { $$id: 0, name: "A" }],
          ["B", { name: "B" }],
          ["AA", { $$ref: 0 }],
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

    const encoded = coder.encode(bar);

    expect(encoded).toEqual({
      "bar/bar": [{ $$id: 0, foo: "foo" }, { $$ref: 0 }],
    });

    const decoded = coder.decode<typeof bar>(encoded);
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
    const encoded = coder.encode(input);
    expect(encoded).toEqual([
      {
        arr: ["$$id:0", 1, 2, 3],
      },
      { arr: { $$ref: 0 } },
    ]);

    const decoded = coder.decode<typeof input>(encoded);
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

    const encoded = coder.encode(select);
    expect(encoded).toEqual({
      options: [{ $$id: 0, value: "foo" }, { value: "foo" }],
      selected: { $$ref: 0 },
    });

    const decoded = coder.decode<typeof select>(encoded);
    expect(decoded).toEqual(select);
    expect(decoded.selected).toBe(decoded.options[0]);
  });

  it("same regex", () => {
    const regex = /foo/;

    const input = [regex, regex];
    const encoded = coder.encode(input);
    expect(encoded).toEqual([{ $$RegExp: "foo", $$id: 0 }, { $$ref: 0 }]);

    const decoded = coder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
    expect(decoded[0]).toBe(decoded[1]);
  });
});

describe("preserve references", () => {
  it("should not preserve references if preserveReferences is false", () => {
    const foo = { foo: "foo" };
    const input = [foo, foo];

    const encoded = coder.encode(input, { preserveReferences: false });
    expect(encoded).toEqual([{ foo: "foo" }, { foo: "foo" }]);

    const decoded = coder.decode<typeof input>(encoded);
    expect(decoded).toEqual(input);
    expect(decoded[0]).not.toBe(decoded[1]);
  });
});

describe("array", () => {
  it("should properly encode and decode array with circular references", () => {
    const arr: any[] = [];
    arr.push(arr, arr, arr);

    const encoded = coder.encode(arr);
    expect(encoded).toEqual([`$$id:0`, { $$ref: 0 }, { $$ref: 0 }, { $$ref: 0 }]);

    const decoded = coder.decode<typeof arr>(encoded);
    expect(decoded[0]).toBe(decoded);
    expect(decoded[1]).toBe(decoded);
    expect(decoded[2]).toBe(decoded);
    expect(decoded[0]).toBe(decoded[1]);
  });
});

describe("directly referenced in itself", () => {
  it("flat set ref itself", () => {
    const foo = new Set<any>();
    foo.add(foo);

    const encoded = coder.encode(foo);

    expect(encoded).toEqual({
      $$id: 0,
      $$Set: [{ $$ref: 0 }],
    });

    const decoded = coder.decode<typeof foo>(encoded);

    const [firstItem] = decoded;

    expect(firstItem).toBe(decoded);
  });

  it("flat map ref itself", () => {
    const foo = new Map<any, any>();
    foo.set(foo, foo);

    const encoded = coder.encode(foo);
    expect(encoded).toEqual({
      $$id: 0,
      $$Map: [[{ $$ref: 0 }, { $$ref: 0 }]],
    });

    const decoded = coder.decode<typeof foo>(encoded);

    expect(decoded.size).toBe(1);
    const [[key, value]] = decoded;
    expect(key).toBe(value);
    expect(key).toBe(decoded);
  });

  it("flat map ref itself as valye", () => {
    const foo = new Map<any, any>();
    foo.set("foo", foo);

    const encoded = coder.encode(foo);
    expect(encoded).toEqual({
      $$id: 0,
      $$Map: [["foo", { $$ref: 0 }]],
    });

    const decoded = coder.decode<typeof foo>(encoded);

    expect(decoded.size).toBe(1);
    const [[key, value]] = decoded;
    expect(key).toBe("foo");
    expect(value).toBe(decoded);
  });

  it("handles nested sets", () => {
    const foo = new Set<any>();
    foo.add({ foo: new Map([["bar", foo]]) });

    const encoded = coder.encode(foo);

    expect(encoded).toEqual({
      $$id: 0,
      $$Set: [{ foo: { $$Map: [["bar", { $$ref: 0 }]] } }],
    });
    const decoded = coder.decode<typeof foo>(encoded);
  });
});
