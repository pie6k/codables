/**
 * This function is called extremely often, so it's optimized for performance.
 *
 * Current path was heavily benchmarked
 */
function escapePathSegment(segment: string): string {
  if (typeof segment === "number") return String(segment);

  if (segment.includes("~") || segment.includes("/")) {
    return segment.replaceAll("~", "~0").replaceAll("/", "~1");
  }

  return segment;
}

export function addPathSegment(currentPointer: string, newSegment: string): string {
  if (currentPointer.length > 1) {
    return `${currentPointer}/${escapePathSegment(newSegment)}`;
  }

  switch (currentPointer) {
    case "/":
    case "":
      return `/${escapePathSegment(newSegment)}`;
    default:
      return `${currentPointer}/${escapePathSegment(newSegment)}`;
  }
}

export function addNumberPathSegment(currentPointer: string, newSegment: number): string {
  if (currentPointer.length > 1) {
    return `${currentPointer}/${newSegment}`;
  }

  switch (currentPointer) {
    case "/":
    case "":
      return `/${newSegment}`;
    default:
      return `${currentPointer}/${newSegment}`;
  }
}
