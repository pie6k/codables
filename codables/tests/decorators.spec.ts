import { Coder } from "../Coder";
import { codableClass } from "../codableClass";

describe.skip("decorators", () => {
  it("should register a class as codable", () => {
    @codableClass("Foo")
    class Foo {
      foo!: string;
    }

    const coder = new Coder();

    coder.registerClass(Foo);

    const foo = new Foo();
    foo.foo = "bar";

    const encoded = coder.encode(foo);

    expect(encoded).toEqual({
      foo: "bar",
    });

    const decoded = coder.decode(encoded);

    expect(decoded).toEqual(foo);
  });
});
