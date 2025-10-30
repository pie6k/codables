const SPECIAL_STRINGS = ["$$undefined", "$$NaN", "$$-0", "$$Infinity", "$$-Infinity"] as const;

const SPECIAL_STRINGS_REGEXP = /^\~*\$\$(?:undefined|NaN|-0|Infinity|-Infinity)$/;

export function maybeEscapeSpecialString(input: string) {
  if (SPECIAL_STRINGS_REGEXP.test(input)) {
    return `~${input}`;
  }

  return input;
}

export function maybeEncodeNumber(input: number) {
  switch (input) {
    case Infinity:
      return "$$Infinity";
    case -Infinity:
      return "$$-Infinity";
    case 0:
      if (1 / input === -Infinity) return "$$-0";
      return input;
  }

  if (isNaN(input)) return "$$NaN";

  return input;
}

export function decodeMaybeSpecialString(input: string) {
  switch (input) {
    case "$$undefined":
      return undefined;
    case "$$NaN":
      return NaN;
    case "$$-0":
      return -0;
    case "$$Infinity":
      return Infinity;
    case "$$-Infinity":
      return -Infinity;
  }

  // if (!SPECIAL_STRINGS_REGEXP.test(input)) return input;

  if (input.startsWith("~") && SPECIAL_STRINGS_REGEXP.test(input)) return input.slice(1);

  return input;
}
