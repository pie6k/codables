export function getErrorExtraProperties(
  error: Error,
): Record<string, unknown> | null {
  const properties: Record<string, unknown> = {};

  let isEmpty = true;

  for (const key of Object.keys(error)) {
    if (key === "message" || key === "name" || key === "cause") continue;

    properties[key] = error[key as keyof Error];
    isEmpty = false;
  }

  if (isEmpty) return null;

  return properties;
}
