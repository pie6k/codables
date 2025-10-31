import { getIsNotNull } from "../is";

const TYPED_ARRAY_MAP = {
  uint8: typeof Uint8Array !== "undefined" ? Uint8Array : null,
  uint8clamped: typeof Uint8ClampedArray !== "undefined" ? Uint8ClampedArray : null,
  uint16: typeof Uint16Array !== "undefined" ? Uint16Array : null,
  uint32: typeof Uint32Array !== "undefined" ? Uint32Array : null,
  int8: typeof Int8Array !== "undefined" ? Int8Array : null,
  int16: typeof Int16Array !== "undefined" ? Int16Array : null,
  int32: typeof Int32Array !== "undefined" ? Int32Array : null,
  float32: typeof Float32Array !== "undefined" ? Float32Array : null,
  float64: typeof Float64Array !== "undefined" ? Float64Array : null,
} as const;

export const TYPED_ARRAY_CLASSES = Object.values(TYPED_ARRAY_MAP).filter(getIsNotNull);

export type TypedArrayTypeName = keyof typeof TYPED_ARRAY_MAP;
export type TypedArray = InstanceType<NonNullable<(typeof TYPED_ARRAY_MAP)[TypedArrayTypeName]>>;

export function getIsTypedArray(value: unknown): value is TypedArray {
  for (const type of Object.values(TYPED_ARRAY_MAP)) {
    if (!type) continue;
    if (value instanceof type) return true;
  }

  return false;
}

export function getTypedArrayType(value: TypedArray): TypedArrayTypeName {
  for (const name of Object.keys(TYPED_ARRAY_MAP)) {
    const TypedArrayClass = TYPED_ARRAY_MAP[name as TypedArrayTypeName];

    if (!TypedArrayClass) continue;

    if (value instanceof TypedArrayClass) {
      return name as TypedArrayTypeName;
    }
  }

  throw new Error(`Unknown typed array type: ${value}`);
}

export function getTypedArrayConstructor(type: TypedArrayTypeName) {
  const TypedArrayClass = TYPED_ARRAY_MAP[type];

  if (TypedArrayClass === null) {
    throw new Error(`Typed array type ${type} is not supported in this environment`);
  }

  if (!TypedArrayClass) {
    throw new Error(`Unknown typed array type: ${type}`);
  }

  return TypedArrayClass;
}
