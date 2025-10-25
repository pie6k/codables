import { detectCodableProperties } from "./properties";

describe("properties", () => {
  it("should detect codable properties", () => {
    class GrandParent {
      g = "g";

      #h = "h";

      get h() {
        return this.#h;
      }

      set h(value: string) {
        this.#h = value;
      }
    }

    class Parent extends GrandParent {
      c = "c";

      d() {}

      e = () => {};

      *f() {}

      *[Symbol.iterator]() {}
    }
    class Foo extends Parent {
      a = "a";
      accessor b = "b";
    }
    const properties = detectCodableProperties(new Foo());

    expect(properties).toEqual(["g", "c", "a", "b", "h"]);
  });
});
