function escapePathSegment(segment: string | number): string {
  if (typeof segment === "number") return `${segment}`;

  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function unescapePathSegment(segment: string): string {
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}

export class JSONPointer {
  constructor(private readonly segments: string[] = []) {}

  static get root() {
    return new JSONPointer([]);
  }

  static fromString(pointer: string) {
    if (pointer === "") return new JSONPointer([]);

    const [, ...tokens] = pointer.split("/");

    const segments = tokens.map(unescapePathSegment);

    return new JSONPointer(segments);
  }

  addSegment(segment: string) {
    return new JSONPointer([...this.segments, segment]);
  }

  toString() {
    if (this.segments.length === 0) return "/";

    return "/" + this.segments.map(escapePathSegment).join("/");
  }

  toUnescapedString() {
    return this.segments.map(unescapePathSegment).join("/");
  }

  select(object: any) {
    let current = object;

    for (const segment of this.segments) {
      current = current[segment];
    }

    return current;
  }
}

export function addPathSegment(
  currentPointer: string,
  newSegment: string | number,
): string {
  switch (currentPointer) {
    case "/":
    case "":
      return `/${escapePathSegment(newSegment)}`;
    default:
      return `${currentPointer}/${escapePathSegment(newSegment)}`;
  }
}
