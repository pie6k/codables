export function getIsForbiddenProperty(property: string): boolean {
  switch (property) {
    case "__proto__":
    case "prototype":
    case "constructor":
      return true;
    default:
      return false;
  }
}
