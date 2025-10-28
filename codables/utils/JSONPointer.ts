function escapePathSegment(segment: string | number): string {
  if (typeof segment === "number") return `${segment}`;

  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

export function addPathSegment(currentPointer: string, newSegment: string | number): string {
  switch (currentPointer) {
    case "/":
    case "":
      return `/${escapePathSegment(newSegment)}`;
    default:
      return `${currentPointer}/${escapePathSegment(newSegment)}`;
  }
}
