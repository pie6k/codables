import { sanitizePathSegment, unescapePathSegment } from "./paths";

describe("paths", () => {
  it("should sanitize path segments", () => {
    expect(sanitizePathSegment("foo.bar")).toBe("foo\\.bar");
    expect(sanitizePathSegment("foo\\.bar")).toBe("foo\\\\.bar");
    expect(sanitizePathSegment("foo")).toBe("foo");
  });

  it("should unescape path segments", () => {
    expect(unescapePathSegment("foo\\.bar")).toBe("foo.bar");
    expect(unescapePathSegment("foo")).toBe("foo");
  });

  it("should handle explicit \\ in path segments", () => {
    expect(sanitizePathSegment("foo\\bar")).toBe("foo\\bar");
    expect(unescapePathSegment("foo\\bar")).toBe("foo\\bar");
    expect(sanitizePathSegment("foo\\\\bar")).toBe("foo\\\\bar");
    expect(unescapePathSegment("foo\\\\bar")).toBe("foo\\\\bar");

    expect(unescapePathSegment("foo\\\\.bar")).toBe("foo\\.bar");
  });
});
