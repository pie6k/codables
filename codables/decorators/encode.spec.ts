import { codable } from "./codable";
import { getCodableProperties } from "./properties";

describe("getCodablePropertiesForInstance", () => {
  it("1 simple class", () => {
    class Foo {
      @codable()
      foo = "foo";
      @codable()
      bar = "bar";
    }

    expect(getCodableProperties(Foo)).toEqual(["foo", "bar"]);
  });

  it("ignore methods", () => {
    class Foo {
      foo() {
        return "foo";
      }

      get aaa() {
        return "aaa";
      }

      bar = "bar";

      baz = () => {};
    }

    expect(getCodableProperties(Foo)).toEqual([]);
  });

  it("class with accessors", () => {
    class Foo {
      @codable()
      accessor foo = "foo";
      @codable()
      accessor bar = "bar";

      @codable()
      baz = "baz";
    }

    expect(getCodableProperties(Foo)).toEqual([
      //
      "foo",
      "bar",
      "baz",
    ]);
  });

  it("class with codable fields", () => {
    class Foo {
      @codable()
      foo = "foo";
      bar = "bar";
    }

    expect(getCodableProperties(Foo)).toEqual(["foo"]);
  });

  it("ignore methods even if marked as codable", () => {
    expect(() => {
      class Foo {
        // @ts-expect-error - method is not an accessor
        @codable()
        foo() {
          return "foo";
        }
      }
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Codable decorator can only be used on fields or accessors]`,
    );
  });

  it("class with codable accessors", () => {
    class Foo {
      @codable()
      accessor foo = "foo";
      accessor bar = "bar";
    }

    expect(getCodableProperties(Foo)).toEqual(["foo"]);
  });

  it("class with codable fields and accessors", () => {
    class Foo {
      @codable()
      accessor foo = "foo";
      @codable()
      bar = "bar";
      baz = "baz";
    }

    expect(getCodableProperties(Foo)).toEqual(["foo", "bar"]);
  });

  describe("inheritance", () => {
    it("simple inheritance", () => {
      class Foo {
        @codable()
        accessor foo = "foo";
      }

      class Bar extends Foo {
        bar = "bar";
      }

      class Baz extends Bar {
        baz = "baz";
      }

      expect(getCodableProperties(Baz)).toEqual(["foo"]);
    });

    it("inheritance with codable fields", () => {
      class Foo {
        @codable()
        foo = "foo";
        foo2 = "foo2";
      }

      class Bar extends Foo {
        @codable()
        bar = "bar";
        bar2 = "bar2";
      }

      class Baz extends Bar {
        @codable()
        baz = "baz";
        baz2 = "baz2";
      }

      expect(getCodableProperties(Baz)).toEqual(["baz", "bar", "foo"]);
    });

    it("mixed inheritance", () => {
      class Foo {
        accessor foo = "foo";
        @codable()
        foo2 = "foo2";

        @codable()
        accessor bar3 = "bar";
      }

      class Bar extends Foo {
        @codable()
        bar = "bar";
        bar2 = "bar2";
      }

      class Baz extends Bar {
        baz = "baz";
        baz2 = "baz2";
      }

      expect(getCodableProperties(Baz)).toEqual(["bar", "bar3", "foo2"]);
    });
  });
});
