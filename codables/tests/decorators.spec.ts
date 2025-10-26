import { codable, codableClass, getCodableMetadata } from "../codableClass";

import { Coder } from "../Coder";

describe("decorators", () => {
  it("should register a class as codable", () => {
    @codableClass("Foo")
    class Foo {
      foo!: string;
      bar!: Set<string>;
    }

    const coder = new Coder();

    coder.register(Foo);

    const foo = new Foo();
    foo.foo = "foo";
    foo.bar = new Set(["bar"]);

    const encoded = coder.encode(foo);

    expect(encoded).toEqual([
      "$$Foo",
      {
        foo: "foo",
        bar: ["$$set", ["bar"]],
      },
    ]);

    const decoded = coder.decode(encoded);

    expect(decoded).toEqual(foo);
  });

  it("if some fields are marked as codable, other properties are not encoded", () => {
    @codableClass("Foo")
    class Foo {
      @codable()
      foo!: string;
      bar!: string;

      @codable()
      accessor baz!: string;

      @codable()
      accessor qux!: Set<string>;
    }

    const coder = new Coder();

    coder.register(Foo);

    const foo = new Foo();
    foo.foo = "foo";
    foo.bar = "bar";
    foo.baz = "baz";
    foo.qux = new Set(["qux"]);
    const encoded = coder.encode(foo);

    expect(encoded).toEqual([
      "$$Foo",
      {
        foo: "foo",
        baz: "baz",
        qux: ["$$set", ["qux"]],
      },
    ]);

    const decoded = coder.decode<Foo>(encoded);

    expect(decoded).not.toEqual(foo);
    expect(decoded.foo).toEqual("foo");
    expect(decoded.bar).toBeUndefined();
  });

  it("will works will not registable accessors", () => {
    @codableClass("Foo")
    class Foo {
      accessor a!: string;
      aa!: string;

      get b() {
        return "b";
      }

      getA() {
        return "a";
      }
    }

    const coder = new Coder();

    coder.register(Foo);

    const foo = new Foo();
    foo.a = "a";
    foo.aa = "aa";

    const encoded = coder.encode(foo);

    expect(encoded).toEqual([
      "$$Foo",
      {
        a: "a",
        aa: "aa",
      },
    ]);

    const decoded = coder.decode<Foo>(encoded);

    expect(decoded).toEqual(foo);
  });
});

describe("metadata", () => {
  it("properly sets metadata on the class", () => {
    @codableClass("Foo")
    class Foo {
      @codable()
      foo!: string;
    }

    @codableClass("Bar")
    class Bar extends Foo {
      @codable()
      bar!: string;
    }

    @codableClass("Baz")
    class Baz extends Bar {
      baz!: string;
    }

    expect(getCodableMetadata(Foo)?.name).toBe("Foo");
    expect(getCodableMetadata(Bar)?.name).toBe("Bar");
    expect(getCodableMetadata(Baz)?.name).toBe("Baz");
  });
});

describe("inheritance", () => {
  it.skip("should encode and decode inherited properties", () => {
    @codableClass("Foo")
    class Foo {
      @codable()
      foo!: string;
    }

    @codableClass("Bar")
    class Bar extends Foo {
      @codable()
      bar!: string;
    }

    @codableClass("Baz")
    class Baz extends Bar {
      baz!: string;
    }

    const coder = new Coder();

    coder.register(Foo, Bar, Baz);

    const foo = new Foo();
    foo.foo = "foo";
    const bar = new Bar();
    bar.bar = "bar";
    const baz = new Baz();
    baz.baz = "baz";

    const encoded = coder.encode(baz);

    expect(encoded).toEqual({
      $$Baz: {
        foo: "foo",
        bar: "bar",
        baz: "baz",
      },
    });
  });
});
