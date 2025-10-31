export type JSONPrimitive = string | number | boolean | null;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;

export type Primitive = string | number | boolean | null | undefined;

export type ClassConstructor<T> = new (...args: any) => T;

export type AtLeastOne<T> = [T, ...T[]];

/**
 * A class that can be instantiated without any arguments.
 */
export type MemberwiseClass<T> = new (input?: Partial<T>) => T;
export type ClassWithoutInput<T> = new () => T;

/**
 * A class that requires arguments to be known in order to be instantiated.
 */
export type ManuallyCodableClass<T> = new (...args: AtLeastOne<any>) => T;

export type AnyCodableClass<T> = MemberwiseClass<T> | ManuallyCodableClass<T>;

export type AnyClass = new (...args: any) => any;
