import { escapeTypeWrapper } from "../format";

describe("escaped type keys", () => {
  it("should escape type keys", () => {
    const input = { $$foo: "bar" };
    const encoded = escapeTypeWrapper(input);
    expect(encoded).toEqual({ "\\$$foo": "bar" });
  });
});
