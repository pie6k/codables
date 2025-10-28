type PropDecorator = (value: any, context: any) => any;

export function combineDecorators(...decorators: PropDecorator[]): PropDecorator {
  const [first, ...rest] = decorators;

  return function (value: any, context: any) {
    let result = first(value, context);

    for (const decorator of rest) {
      result = decorator(result, context);
    }

    return result;
  };
}
