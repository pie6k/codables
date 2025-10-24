export function getIn(input: object, propertyPath: string[]): unknown {
  let pointer = input;

  for (let i = 0; i < propertyPath.length; i++) {
    const propertyName = propertyPath[i];

    if (!propertyName) continue;

    pointer = Reflect.get(pointer as object, propertyName) as object;
  }

  return pointer;
}

export function setIn(
  input: object,
  propertyPath: string[],
  valueChanger: unknown | ((current: unknown) => unknown)
): object {
  if (propertyPath.length === 0) {
    throw new Error("Property path is empty");
  }

  let pointer = input;

  for (let i = 0; i < propertyPath.length; i++) {
    const propertyName = propertyPath[i];
    const isLastProperty = i === propertyPath.length - 1;

    const propertyValue = Reflect.get(
      pointer as object,
      propertyName
    ) as object;

    if (!isLastProperty) {
      pointer = propertyValue;
      continue;
    }

    Reflect.set(
      pointer as object,
      propertyName,
      typeof valueChanger === "function"
        ? valueChanger(propertyValue)
        : valueChanger
    );
    return pointer;
  }

  return pointer;
}
