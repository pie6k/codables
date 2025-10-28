type NonFunctionKeys<T> = keyof {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

export type Memberwise<T, K extends NonFunctionKeys<T> = NonFunctionKeys<T>> = {
  [P in K]: T[P];
};

export type MemberwiseExclude<T, K extends NonFunctionKeys<T>> = {
  [P in keyof T as P extends K ? never : T[P] extends Function ? never : P]: T[P];
};
