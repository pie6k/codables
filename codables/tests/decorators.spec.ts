import { Coder } from "../Coder";
import { Memberwise, MemberwiseExclude } from "../decorators";
import { codable } from "../decorators/codable";
import { codableClass } from "../decorators/codableClass";

describe("decorators", () => {
  it("should register a class as codable", () => {
    @codableClass("Foo")
    class Foo {
      @codable()
      foo: string = "foo";
      @codable()
      bar: Set<string> = new Set(["bar"]);
    }

    const coder = new Coder([Foo]);

    const foo = new Foo();

    const encoded = coder.encode(foo);

    expect(encoded).toEqual({
      $$Foo: [{ foo: "foo", bar: { $$Set: ["bar"] } }],
    });

    const decoded = coder.decode({
      $$Foo: [{ foo: "foo", bar: { $$Set: ["bar"] } }],
    });

    expect(decoded).toEqual(foo);
  });

  it("if no fields are marked as codable, no properties are encoded", () => {
    @codableClass("Foo")
    class Foo {
      foo!: string;
      bar!: string;
    }

    const coder = new Coder([Foo]);

    const foo = new Foo();
    foo.foo = "foo";
    foo.bar = "bar";

    const encoded = coder.encode(foo);

    expect(encoded).toEqual({ $$Foo: [{}] });
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

    const coder = new Coder([Foo]);

    const foo = new Foo();
    foo.foo = "foo";
    foo.bar = "bar";
    foo.baz = "baz";
    foo.qux = new Set(["qux"]);
    const encoded = coder.encode(foo);

    expect(encoded).toEqual({
      $$Foo: [{ foo: "foo", baz: "baz", qux: { $$Set: ["qux"] } }],
    });

    const decoded = coder.decode<Foo>({
      $$Foo: [{ foo: "foo", baz: "baz", qux: { $$Set: ["qux"] } }],
    });

    expect(decoded).not.toEqual(foo);
    expect(decoded.foo).toEqual("foo");
    expect(decoded.bar).toBeUndefined();
  });

  it("will works will not registable accessors", () => {
    @codableClass("Foo")
    class Foo {
      @codable()
      accessor a!: string;
      @codable()
      aa!: string;

      get b() {
        return "b";
      }

      getA() {
        return "a";
      }
    }

    const coder = new Coder([Foo]);

    const foo = new Foo();
    foo.a = "a";
    foo.aa = "aa";

    const encoded = coder.encode(foo);

    expect(encoded).toEqual({ $$Foo: [{ a: "a", aa: "aa" }] });

    const decoded = coder.decode<Foo>({ $$Foo: [{ a: "a", aa: "aa" }] });

    expect(decoded).toEqual(foo);
  });
});

describe("constructor is called", () => {
  it("should call the constructor", () => {
    @codableClass("Foo")
    class Foo {
      foo: string;

      @codable()
      bar!: string;

      constructor() {
        this.foo = "foo";
      }
    }

    const coder = new Coder([Foo]);

    const foo = new Foo();
    foo.bar = "bar";

    const encoded = coder.encode(foo);

    expect(encoded).toEqual({ $$Foo: [{ bar: "bar" }] });

    const decoded = coder.decode<Foo>(encoded);

    expect(decoded).toEqual(foo);
    expect(decoded.foo).toBe("foo");
  });
});

describe("inheritance", () => {
  it("should encode and decode inherited properties", () => {
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
      @codable()
      baz!: string;
    }

    const coder = new Coder([Baz]);

    const baz = new Baz();
    baz.baz = "baz";
    baz.foo = "foo";
    baz.bar = "bar";

    const encoded = coder.encode(baz);

    expect(encoded).toEqual({
      $$Baz: [
        {
          foo: "foo",
          bar: "bar",
          baz: "baz",
        },
      ],
    });
  });
});

describe("custom constructor requires proper options", () => {
  it("typescript should error if the constructor requires options but no options are provided", () => {
    // @ts-expect-error
    @codableClass("Foo")
    class Foo {
      age!: number;

      constructor(public foo: string) {}
    }
  });

  it("typescript should error if the constructor requires options but no options are provided", () => {
    @codableClass("Foo")
    class Foo {
      age!: number;

      constructor(input: Memberwise<Foo>) {
        Object.assign(this, input);
      }
    }
  });
});

describe("keys option", () => {
  it("keys option also works", () => {
    @codableClass("Foo", { keys: ["foo", "bar"] })
    class Foo {
      foo = "foo";
      bar = "bar";
    }

    const coder = new Coder([Foo]);

    expect(coder.encode(new Foo())).toEqual({
      $$Foo: [{ foo: "foo", bar: "bar" }],
    });
  });

  it("keys option is added to decorated properties", () => {
    @codableClass("Foo", { keys: ["foo", "bar"] })
    class Foo {
      foo = "foo";
      bar = "bar";

      @codable()
      baz = "baz";

      qux = "qux";
    }

    const coder = new Coder([Foo]);

    expect(coder.encode(new Foo())).toEqual({
      $$Foo: [{ foo: "foo", bar: "bar", baz: "baz" }],
    });
  });
});

describe("inheritance conflicts", () => {
  it("uses type of the deepest class", () => {
    @codableClass("Foo")
    class Foo {
      @codable()
      foo = "foo";
    }

    @codableClass("Bar")
    class Bar extends Foo {
      @codable()
      bar = "bar";
    }

    /**
     * Order is important - Foo (parent class) is first (kinda bad) as it will be the first
     * to try to match the input. As `bar` is also instance of Foo, it will be allowed to match
     */
    const coder = new Coder([Foo, Bar]);

    expect(coder.encode(new Bar())).toEqual({
      $$Bar: [{ foo: "foo", bar: "bar" }],
    });
  });
});

describe("constructor", () => {
  it("should call the constructor with memberwise data", () => {
    const calls: any[] = [];
    @codableClass("Foo")
    class Foo {
      @codable()
      foo: string;

      notCodable = "notCodable";

      constructor(input: MemberwiseExclude<Foo, "notCodable">) {
        this.foo = input.foo;
        calls.push(input);
      }
    }

    const coder = new Coder([Foo]);

    const foo = new Foo({ foo: "foo" });

    expect(coder.encode(foo)).toEqual({
      $$Foo: [{ foo: "foo" }],
    });

    const decoded = coder.decode<Foo>({ $$Foo: [{ foo: "foo" }] });

    expect(decoded).toEqual(foo);
    expect(calls).toEqual([{ foo: "foo" }, { foo: "foo" }]);
    expect(decoded.foo).toBe("foo");
  });
});

describe("keys mapping", () => {
  it("should re-map keys from @codableClass options", () => {
    @codableClass("Foo", { keys: { foo: "new_foo", bar: "new_bar" } })
    class Foo {
      foo = "foo";
      bar = "bar";
    }

    const coder = new Coder([Foo]);

    expect(coder.encode(new Foo())).toEqual({
      $$Foo: [{ new_foo: "foo", new_bar: "bar" }],
    });

    const decoded = coder.decode<Foo>({ $$Foo: [{ new_foo: "foo", new_bar: "bar" }] });

    expect(decoded).toEqual(new Foo());
  });

  it("should re-map keys from @codable options", () => {
    @codableClass("Foo")
    class Foo {
      @codable("new_foo")
      foo = "foo";
    }

    const coder = new Coder([Foo]);

    expect(coder.encode(new Foo())).toEqual({
      $$Foo: [{ new_foo: "foo" }],
    });

    const decoded = coder.decode<Foo>({ $$Foo: [{ new_foo: "foo" }] });

    expect(decoded).toEqual(new Foo());
  });
});
