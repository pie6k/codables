export function getErrorExtraProperties(
  error: Error
): Record<string, unknown> | null {
  const properties: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(error)) {
    if (key === "message" || key === "name" || key === "cause") continue;

    properties[key] = value;
  }

  const isEmpty = Object.keys(properties).length === 0;

  if (isEmpty) return null;

  return properties;
}
