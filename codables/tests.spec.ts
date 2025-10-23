import { Coder, coder } from "./Coder";
import { describe, expect, it } from "vitest";

import { createCoderType } from "./CoderType";

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
