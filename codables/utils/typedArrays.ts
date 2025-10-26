const TYPED_ARRAY_MAP = {
  uint8: Uint8Array,
  uint8clamped: Uint8ClampedArray,
  uint16: Uint16Array,
  uint32: Uint32Array,
  int8: Int8Array,
  int16: Int16Array,
  int32: Int32Array,
  float32: Float32Array,
  float64: Float64Array,
} as const;

export type TypedArrayTypeName = keyof typeof TYPED_ARRAY_MAP;
export type TypedArray = InstanceType<
  (typeof TYPED_ARRAY_MAP)[TypedArrayTypeName]
>;

export function getIsTypedArray(value: unknown): value is TypedArray {
  for (const type of Object.values(TYPED_ARRAY_MAP)) {
    if (value instanceof type) return true;
  }

  return false;
}

export function getTypedArrayType(value: TypedArray): TypedArrayTypeName {
  for (const name of Object.keys(TYPED_ARRAY_MAP)) {
    if (value instanceof TYPED_ARRAY_MAP[name as TypedArrayTypeName])
      return name as TypedArrayTypeName;
  }

  throw new Error(`Unknown typed array type: ${value}`);
}

export function getTypedArrayConstructor(type: TypedArrayTypeName) {
  const TypedArrayClass = TYPED_ARRAY_MAP[type];

  if (!TypedArrayClass) {
    throw new Error(`Unknown typed array type: ${type}`);
  }

  return TypedArrayClass;
}
