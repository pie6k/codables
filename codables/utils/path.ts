export type Path = string;

export const ROOT_PATH: Path = "/";

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

function unescapePathSegment(segment: string): string {
  return segment.replaceAll("~0", "~").replaceAll("~1", "/");
}

export function splitPath(path: Path): string[] {
  const segments = path.split("/").map(unescapePathSegment);

  if (path.startsWith("/")) {
    // remove first empty segment
    segments.shift();
  }

  return segments;
}

export function addPathSegment(currentPointer: Path, newSegment: string): Path {
  switch (currentPointer) {
    case "/":
    case "":
      return `/${escapePathSegment(newSegment)}`;
    default:
      return `${currentPointer}/${escapePathSegment(newSegment)}`;
  }
}

export function addNumberPathSegment(currentPointer: Path, newSegment: number): Path {
  switch (currentPointer) {
    case "/":
    case "":
      return `/${newSegment}`;
    default:
      return `${currentPointer}/${newSegment}`;
  }
}
