export function getSpecialNumberType(value: number) {
  if (isNaN(value)) return "NaN";
  if (value === Infinity) return "Infinity";
  if (value === -Infinity) return "-Infinity";
  // No idea what use case this is for, but it's a valid special number (and JSON normally serializes it as 0)
  if (value === 0 && 1 / value === -Infinity) return "-0";

  return null;
}

type SpecialNumberType = ReturnType<typeof getSpecialNumberType>;

export function decodeSpecialNumber(value: SpecialNumberType): number {
  if (value === "NaN") return NaN;
  if (value === "Infinity") return Infinity;
  if (value === "-Infinity") return -Infinity;
  if (value === "-0") return -0;

  throw new Error(`Invalid special number type: ${value}`);
}
