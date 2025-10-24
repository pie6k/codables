const NON_ESCAPED_DOT = /(?<!\\)\./g;

/**
 * If path includes dots: it will be escaped with \.
 *
 * eg. "foo.bar" -> "foo\.bar"
 *
 * if dot is already escaped, it will be unescaped - it will not be escaped again.
 *
 * eg. "foo\.bar" -> "foo\.bar"
 */
export function sanitizePathSegment(segment: string): string {
  // Regex: . that is not already preceded by a backslash
  return segment.replace(/\./g, "\\.");
}

export function unescapePathSegment(segment: string): string {
  return segment.replace(/\\\./g, ".");
}

export function addPathSegment(path: string, segment: string): string {
  return path.length === 0 ? segment : `${path}.${segment}`;
}
