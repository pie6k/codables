# Codables

A high-performance, type-safe JSON serialization library that extends JSON to support complex JavaScript types including `Date`, `BigInt`, `Map`, `Set`, `RegExp`, `Symbol`, typed arrays, circular references, and custom classes.

Codables offers better performance than alternatives like SuperJSON while making it easier to automatically handle custom classes with nested, complex data through decorator-based serialization.

## Key Features

- **Type Safety**: Full TypeScript support with autocompletion and type inference
- **Performance**: Optimized encoding/decoding with minimal runtime overhead
- **Automatic Class Serialization**: Decorator-based approach for seamless custom class handling
- **Circular Reference Support**: Handles complex object graphs with reference preservation
- **Framework Agnostic**: Works with any JavaScript/TypeScript project
- **Extensible**: Easy to add custom type encoders
- **Format Collision Safe**: Handles edge cases where data conflicts with internal format

## Installation

```bash
npm install codables
# or
yarn add codables
# or
pnpm add codables
```

## Quick Start

```typescript
import { encode, decode, stringify, parse } from "codables";

// Basic usage - works just like JSON but with more types
const data = {
  date: new Date("2025-01-01"),
  bigInt: 123n,
  set: new Set(["a", "b", "c"]),
  map: new Map([["key", "value"]]),
  regex: /hello/gi,
  symbol: Symbol("test"),
};

// Encode to JSON-compatible format
const encoded = encode(data);
// Result: { date: { $$date: "2025-01-01T00:00:00.000Z" }, ... }

// Decode back to original types
const decoded = decode(encoded);
// decoded.date instanceof Date === true

// Or use stringify/parse for convenience
const jsonString = stringify(data);
const restored = parse(jsonString);
```

## Core Concepts

### How Codables Extends JSON

Codables uses a tagged format where non-JSON types are wrapped with a `$$` prefix:

```typescript
// Original JavaScript object
const data = {
  date: new Date('2025-01-01'),
  set: new Set([1, 2, 3])
};

// Encoded format
{
  "date": { "$$date": "2025-01-01T00:00:00.000Z" },
  "set": { "$$set": [1, 2, 3] }
}
```

### Built-in Type Support

Codables automatically handles these JavaScript types:

- `Date` → `{ $$date: "ISO-string" }`
- `BigInt` → `{ $$bigInt: "string" }`
- `Set` → `{ $$set: [array] }`
- `Map` → `{ $$map: [entries] }`
- `RegExp` → `{ $$regexp: "pattern" }` or `{ $$regexp: ["pattern", "flags"] }`
- `Symbol` → `{ $$symbol: "description" }`
- `URL` → `{ $$url: "string" }`
- `URLSearchParams` → `{ $$urlSearchParams: "string" }`
- `Error` → `{ $$error: "message" }` or `{ $$error: { message, name, cause, properties } }`
- `undefined` → `{ $$undefined: null }`
- Typed Arrays (`Uint8Array`, `Float64Array`, etc.) → `{ $$typedArray: { type, data } }`
- Special numbers (`NaN`, `Infinity`, `-0`) → `{ $$num: "special-value" }`

## Usage Examples

### Built-in Types

```typescript
import { encode, decode } from "codables";

// Dates
const date = new Date("2025-01-01");
const encoded = encode(date);
// { $$date: "2025-01-01T00:00:00.000Z" }
const decoded = decode(encoded); // instanceof Date === true

// BigInt
const bigInt = 1234567890123456789n;
const encoded = encode(bigInt);
// { $$bigInt: "1234567890123456789" }

// Sets and Maps
const set = new Set(["a", "b", "c"]);
const map = new Map([
  ["key1", "value1"],
  ["key2", "value2"],
]);
const encoded = encode({ set, map });
// { set: { $$set: ['a', 'b', 'c'] }, map: { $$map: [['key1', 'value1'], ['key2', 'value2']] } }

// Regular Expressions
const regex = /hello/gi;
const encoded = encode(regex);
// { $$regexp: ['hello', 'gi'] }

// Symbols
const symbol = Symbol("test");
const encoded = encode(symbol);
// { $$symbol: 'test' }
```

### Custom Types

```typescript
import { Coder } from "codables";

const coder = new Coder();

// Define a custom type
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

// Register the type
coder.addType(
  "Point",
  (value) => value instanceof Point,
  (point) => [point.x, point.y],
  ([x, y]) => new Point(x, y),
);

// Use it
const point = new Point(10, 20);
const encoded = coder.encode(point);
// { $$Point: [10, 20] }
const decoded = coder.decode(encoded); // instanceof Point === true
```

### Class Decorators

The most powerful feature - automatic class serialization with decorators:

```typescript
import { codableClass, codable, Coder } from "codables";

@codableClass("User")
class User {
  @codable()
  name!: string;

  @codable()
  email!: string;

  @codable()
  loginDates!: Set<Date>;

  @codable()
  preferences!: Map<string, any>;

  // Non-codable properties are ignored
  private internalId = Math.random();
}

const coder = new Coder();
coder.register(User);

const user = new User();
user.name = "John Doe";
user.email = "john@example.com";
user.loginDates = new Set([new Date("2025-01-01")]);
user.preferences = new Map([["theme", "dark"]]);

const encoded = coder.encode(user);
// { $$User: { name: 'John Doe', email: 'john@example.com', loginDates: { $$set: [{ $$date: '2025-01-01T00:00:00.000Z' }] }, preferences: { $$map: [['theme', 'dark']] } } }

const decoded = coder.decode(encoded); // instanceof User === true
```

### Circular References

Codables automatically handles circular references and preserves object identity:

```typescript
import { encode, decode } from "codables";

// Create circular reference
const parent = { name: "Parent", children: [] };
const child = { name: "Child", parent };
parent.children.push(child);

const encoded = encode(parent);
// { name: 'Parent', children: [{ name: 'Child', parent: { $$ref: '/' } }] }

const decoded = decode(encoded);
// decoded.children[0].parent === decoded (same reference)
```

### Reference Preservation Options

```typescript
import { encode } from "codables";

const shared = { value: "shared" };
const data = [shared, shared];

// Preserve references (default)
const withRefs = encode(data);
// [{ value: 'shared' }, { $$ref: '/0' }]

// Don't preserve references
const withoutRefs = encode(data, { preserveReferences: false });
// [{ value: 'shared' }, { value: 'shared' }]
```

### Unknown Input Handling

```typescript
import { encode } from "codables";

class UnknownClass {
  constructor(public value: string) {}
}

const unknown = new UnknownClass("test");

// Default behavior - throw error
try {
  encode(unknown);
} catch (error) {
  // Error: Not able to encode - no matching type found
}

// Alternative modes
encode(unknown, { unknownInputMode: "null" }); // Returns null
encode(unknown, { unknownInputMode: "unchanged" }); // Returns original object
```

## Advanced Features

### Custom Coder Instances

```typescript
import { Coder } from "codables";

// Create a custom coder with specific types
const customCoder = new Coder();

class CustomType {
  constructor(public value: string) {}
}

customCoder.addType(
  "CustomType",
  (value) => value instanceof CustomType,
  (instance) => instance.value,
  (value) => new CustomType(value),
);

// Use the custom coder
const instance = new CustomType("test");
const encoded = customCoder.encode(instance);
const decoded = customCoder.decode(encoded);
```

### Format Collision Handling

Codables automatically handles cases where your data conflicts with the internal format:

```typescript
import { encode, decode } from "codables";

// This would normally conflict with Set encoding
const data = { $$set: [1, 2, 3] };

const encoded = encode(data);
// { "~$$set": [1, 2, 3] } - automatically escaped

const decoded = decode(encoded);
// decoded.$$set === [1, 2, 3] - correctly restored
```

## API Reference

### Default Exports

```typescript
import { encode, decode, stringify, parse } from 'codables';

// Encode any value to JSON-compatible format
encode<T>(value: T): JSONValue

// Decode JSON-compatible format back to original types
decode<T>(value: JSONValue): T

// Convenience methods that combine with JSON.stringify/parse
stringify<T>(value: T): string
parse<T>(value: string): T
```

### Coder Class

```typescript
import { Coder } from 'codables';

const coder = new Coder();

// Register custom types
coder.addType<Item, Data>(
  name: string,
  canEncode: (value: unknown) => value is Item,
  encode: (data: Item) => Data,
  decode: (data: Data) => Item
): void

// Register multiple types or classes
coder.register(...typesOrClasses: (CoderType | AnyCodableClass)[]): void

// Encode/decode with options
coder.encode<T>(value: T, options?: EncodeOptions): JSONValue
coder.decode<T>(value: JSONValue): T
coder.stringify<T>(value: T): string
coder.parse<T>(value: string): T

// Utility methods
coder.getTypeByName(name: string): CoderType | null
coder.getMatchingTypeFor(input: unknown): CoderType | null
```

### Decorators

```typescript
import { codableClass, codable } from 'codables';

// Class decorator - marks a class as serializable
@codableClass(name: string, options?: { dependencies?: () => AnyCodableClass[] })

// Property decorator - marks properties for serialization
@codable()
```

## Performance & Comparison

Codables is designed as a high-performance alternative to SuperJSON with several advantages:

- **Better TypeScript Integration**: Full type safety with decorator-based class serialization
- **Automatic Class Handling**: No manual serialization logic needed for custom classes
- **Optimized Encoding**: Efficient handling of common JavaScript types
- **Reference Preservation**: Smart circular reference detection and handling
- **Format Safety**: Automatic collision detection and resolution

The library maintains excellent performance characteristics while providing a more developer-friendly API for complex data structures.

## Use Cases

### Full-Stack Frameworks

Perfect for Next.js, Remix, and other full-stack frameworks where you need to serialize complex data between server and client:

```typescript
// In your API route
export async function GET() {
  const data = {
    user: new User("John"),
    lastLogin: new Date(),
    preferences: new Map([["theme", "dark"]]),
  };

  return Response.json(encode(data));
}

// On the client
const response = await fetch("/api/data");
const data = decode(await response.json());
// All types are properly restored
```

### Data Persistence

Serialize complex application state for storage:

```typescript
const appState = {
  user: currentUser,
  cache: new Map(),
  timestamps: new Set([new Date()]),
};

localStorage.setItem("state", stringify(appState));
const restored = parse(localStorage.getItem("state")!);
```

### API Communication

Send complex data structures over HTTP with full type preservation:

```typescript
const payload = {
  metadata: new Map([["version", "1.0"]]),
  createdAt: new Date(),
  tags: new Set(["important", "urgent"]),
};

const response = await fetch("/api/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: stringify(payload),
});
```

## Playground

Try Codables in your browser: [https://codables-playground.vercel.app](https://codables-playground.vercel.app)

The playground lets you experiment with different data types, see the encoded output, and test circular reference handling in real-time.

## License

MIT
