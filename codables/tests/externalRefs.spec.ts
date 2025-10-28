import { Coder, defaultCoder } from "../Coder";

import { codable } from "../decorators/codable";
import { codableClass } from "../decorators/codableClass";
import { external } from "../decorators/external";
import { externalReference } from "../ExternalReference";

describe("external refs", () => {
  it("should encode and decode external refs", () => {
    const someObject = { foo: "bar" };

    const data = {
      ext: externalReference<typeof someObject>("ext"),
    };

    const encoded = defaultCoder.encode(data);

    expect(encoded).toEqual({
      ext: { $$external: "ext" },
    });

    const decoded = defaultCoder.decode<typeof data>(encoded, { externalReferences: { ext: someObject } });

    expect(decoded.ext).toBe(someObject);
  });

  it("should throw an error if external reference is not found", () => {
    const data = {
      ext: externalReference("ext"),
    };

    const encoded = defaultCoder.encode(data);

    expect(() =>
      defaultCoder.decode<typeof data>(encoded, { externalReferences: { nope: {} } }),
    ).toThrowErrorMatchingInlineSnapshot(`[Error: External reference "ext" not found]`);
  });

  it("works with decorators", () => {
    const constructorSpy = vi.fn();

    class ExternalContext {
      type = "context";
    }
    @codableClass("Foo")
    class Foo {
      @external("context")
      context!: ExternalContext;

      @codable()
      foo: string = "foo";

      constructor({ foo, context }: { foo: string; context?: ExternalContext }) {
        constructorSpy({ foo, context });
        this.foo = foo;

        if (context) {
          this.context = context;
        }
      }
    }

    const coder = new Coder([Foo]);

    const context = new ExternalContext();

    const foo = new Foo({ foo: "bar", context });

    const encoded = coder.encode(foo);

    expect(encoded).toEqual({
      $$Foo: [{ foo: "bar", context: { $$external: "context" } }],
    });

    const decoded = coder.decode<Foo>(encoded, { externalReferences: { context } });

    expect(decoded).toEqual(foo);
    expect(decoded.context).toBe(context);

    expect(constructorSpy).toHaveBeenLastCalledWith({ foo: "bar", context });

    expect(() => coder.decode<Foo>(encoded, { externalReferences: { nope: {} } })).toThrowErrorMatchingInlineSnapshot(
      `[Error: External reference "context" not found]`,
    );
  });

  it("should throw if external is also marked as codable", () => {
    expect(() => {
      @codableClass("Foo")
      class Foo {
        @external("ext")
        @codable()
        context!: unknown;
      }
    }).toThrowErrorMatchingInlineSnapshot(`[Error: External decorator cannot be used on codable properties]`);

    expect(() => {
      @codableClass("Foo")
      class Foo {
        @codable()
        @external("ext")
        context!: unknown;
      }
    }).toThrowErrorMatchingInlineSnapshot(`[Error: Codable decorator cannot be used on external properties]`);
  });
});
