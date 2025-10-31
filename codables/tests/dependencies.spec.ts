import { CodableDependencies } from "../dependencies";
import { Coder } from "../Coder";
import { codable } from "../decorators/codable";
import { codableClass } from "../decorators/codableClass";
import { codableType } from "../CodableType";

describe("dependencies", () => {
  it("should auto discover dependencies from decorated", () => {
    @codableClass("Bar")
    class Bar {
      @codable()
      bar: string = "bar";
    }

    @codableClass("Foo", { dependencies: [Bar] })
    class Foo {
      @codable()
      bar = new Bar();
    }

    const coder = new Coder([Foo]);

    const bar = new Bar();

    const matchingType = coder.getMatchingTypeForObject(bar);

    expect(matchingType).not.toBeNull();

    expect(coder.encode(new Foo())).toEqual({
      $$Foo: [{ bar: { $$Bar: [{ bar: "bar" }] } }],
    });

    const decoded = coder.decode<Foo>({ $$Foo: [{ bar: { $$Bar: [{ bar: "bar" }] } }] });

    expect(decoded).toEqual(new Foo());
    expect(decoded.bar).toEqual(new Bar());
  });

  it("should auto discover dependencies from type", () => {
    class Bar {}
    class Foo {}

    const $$Bar = codableType(
      "Bar",
      (value) => value instanceof Bar,
      () => null,
      () => new Bar(),
      {
        dependencies: (): CodableDependencies => [$$Foo] as CodableDependencies,
      },
    );
    const $$Foo = codableType<Foo, null>(
      "Foo",
      (value) => value instanceof Foo,
      () => null,
      () => new Foo(),
      {
        dependencies: (): CodableDependencies => [$$Bar],
      },
    );

    const foo = new Foo();
    const bar = new Bar();

    const fooCoder = new Coder([$$Foo]);
    const barCoder = new Coder([$$Bar]);

    expect(fooCoder.getMatchingTypeForObject(foo)).not.toBeNull();
    expect(fooCoder.getMatchingTypeForObject(bar)).not.toBeNull();

    expect(barCoder.getMatchingTypeForObject(bar)).not.toBeNull();
    expect(barCoder.getMatchingTypeForObject(foo)).not.toBeNull();
  });

  it("auto discovers nested dependencies", () => {
    @codableClass("Foo")
    class Foo {}
    @codableClass("Bar", { dependencies: [Foo] })
    class Bar {}
    @codableClass("Baz", { dependencies: [Bar] })
    class Baz {}

    const coder = new Coder([Baz]);

    expect(coder.getMatchingTypeForObject(new Foo())).not.toBeNull();
  });
});
