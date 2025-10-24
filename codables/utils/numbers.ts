export function getSpecialNumberType(value: number) {
  if (isNaN(value)) return "NaN";
  if (value === Infinity) return "Infinity";
  if (value === -Infinity) return "-Infinity";
  if (value === 0 && 1 / value === -Infinity) return "-0";

  return null;
}
