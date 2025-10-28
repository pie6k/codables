export type AnyClass = new (...args: any) => any;

export type AtLeastOne<T> = [T, ...T[]];

export type AnyClassWithArgs = new (...args: AtLeastOne<any>) => any;

type Extends<T, U> = T extends U ? true : false;

export type MemberwiseClass<T extends AnyClass> =
  ConstructorParameters<T> extends [] | [Partial<InstanceType<T>>] ? T : never;

export type IsMemberwiseClass<T extends AnyClass> =
  ConstructorParameters<T> extends [Partial<InstanceType<T>>] ? true : false;

export type If<Condition, True, False> = Condition extends true ? True : False;

export type ClassDecorator<T extends AnyClass> = (
  Class: T,
  context: ClassDecoratorContext<T>,
) => void;

export type Voidable<T> = T | void;

export type VoidableIf<T, Condition> = Condition extends true ? Voidable<T> : T;

export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
