export const PROTOTYPE_POLLUTION_RISK_PROPERTIES = [
  "__proto__",
  "prototype",
  "constructor",
];

export function getIsForbiddenProperty(property: string): boolean {
  return PROTOTYPE_POLLUTION_RISK_PROPERTIES.includes(property);
}

export function assertNotForbiddenProperty(property: string): void {
  if (getIsForbiddenProperty(property)) {
    throw new Error(`"${property}" is not allowed as a codable property`);
  }
}
