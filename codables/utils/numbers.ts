export function getSpecialNumberType(value: number) {
  switch (value) {
    case Infinity:
      return "Infinity";
    case -Infinity:
      return "-Infinity";
    case 0:
      if (1 / value === -Infinity) return "-0";
      return null;
  }

  if (isNaN(value)) return "NaN";

  return null;
}

type SpecialNumberType = ReturnType<typeof getSpecialNumberType>;

export function decodeSpecialNumber(value: SpecialNumberType): number {
  switch (value) {
    case "NaN":
      return NaN;
    case "Infinity":
      return Infinity;
    case "-Infinity":
      return -Infinity;
    case "-0":
      return -0;
    default:
      throw new Error(`Invalid special number type: ${value}`);
  }
}
