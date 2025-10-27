# Codables

A high-performance, type-safe JSON serialization library that supports complex types like `Date`, `BigInt`, `Map`, `Set`, `RegExp`, `Symbol`,circular references, and custom classes.

Codables makes it easier to automatically handle custom classes with nested, complex data through single source of truth, decorator-based serialization.

## Motivation

While there are plenty of JSON serialization libraries, none make working with complex, nested classes truly simple.

**For simple use cases**, Codables handles JavaScript types that JSON can't serialize (`Date`, `BigInt`, `Map`, `Set`, etc.) automatically and efficiently.

**For complex use cases**, Codables eliminates the dual-format problem. Consider a game with `GameState` containing multiple `Player`s:

**Traditional approach - maintaining two formats:**

```typescript
// Your classes
class Player {
  constructor(
    public name: string,
    public score: number,
  ) {}
}

class GameState {
  constructor(
    public players: Set<Player>,
    public createdAt: Date,
  ) {}
}

// Separate data interfaces
interface PlayerData {
  name: string;
  score: number;
}

interface GameStateData {
  players: PlayerData[]; // Set becomes array
  createdAt: string; // Date becomes string
}

// Manual conversion logic
function gameStateToData(state: GameState): GameStateData {
  return {
    players: Array.from(state.players).map((p) => ({
      name: p.name,
      score: p.score,
    })),
    createdAt: state.createdAt.toISOString(),
  };
}

function dataToGameState(data: GameStateData): GameState {
  return new GameState(
    new Set(data.players.map((p) => new Player(p.name, p.score))),
    new Date(data.createdAt),
  );
}
```

**With Codables - single source of truth:**

```typescript
import { codableClass, codable, Coder } from "codables";

@codableClass("Player")
class Player {
  @codable() name!: string;
  @codable() score!: number;
}

@codableClass("GameState")
class GameState {
  @codable() players!: Set<Player>;
  @codable() createdAt!: Date;
}

const coder = new Coder();
coder.register(Player, GameState);

// That's it! Serialization is automatic
const gameState = new GameState(
  new Set([new Player("Alice", 100), new Player("Bob", 200)]),
  new Date(),
);

const encoded = coder.encode(gameState); // Automatic serialization
const decoded = coder.decode(encoded); // Automatic deserialization
```

Codables lets you work with your objects naturally while seamlessly persisting and transmitting them.

## Key Features

- **Serializes (almost) every built-in JavaScript type**: `Date`, `BigInt`, `Map`, `Set`, `RegExp`, `Symbol`, `Error`, `URL`, typed arrays, and more
- **Human-readable output**: Uses tagged format that's still readable and debuggable
- **Great performance**: Optimized encoding/decoding with minimal runtime overhead
- **Manages circular refs and reference equality**: Handles complex object graphs with reference preservation
- **Extensible**: Super easy to add new, custom serialization types
- **Type Safety**: Full TypeScript support with autocompletion and type inference
- **Framework Agnostic**: Works with any JavaScript/TypeScript project
- **Format Collision Safe**: Handles edge cases where data conflicts with internal format

### Supported Types

| JavaScript Type   | Encoded Format                                                                  | Notes                              |
| ----------------- | ------------------------------------------------------------------------------- | ---------------------------------- |
| `Date`            | `{ $$date: "ISO-string" }`                                                      | Valid dates only                   |
| `BigInt`          | `{ $$bigInt: "string" }`                                                        | Large integers                     |
| `Set`             | `{ $$set: [array] }`                                                            | Unique collections                 |
| `Map`             | `{ $$map: [entries] }`                                                          | Key-value pairs                    |
| `RegExp`          | `{ $$regexp: "pattern" }` or `{ $$regexp: ["pattern", "flags"] }`               | With or without flags              |
| `Symbol`          | `{ $$symbol: "description" }`                                                   | Symbol registry                    |
| `URL`             | `{ $$url: "string" }`                                                           | Web URLs                           |
| `URLSearchParams` | `{ $$urlSearchParams: "string" }`                                               | Query parameters                   |
| `Error`           | `{ $$error: "message" }` or `{ $$error: { message, name, cause, properties } }` | With optional properties           |
| `undefined`       | `{ $$undefined: null }`                                                         | Missing values                     |
| Typed Arrays      | `{ $$typedArray: { type, data } }`                                              | `Uint8Array`, `Float64Array`, etc. |
| Special Numbers   | `{ $$num: "special-value" }`                                                    | `NaN`, `Infinity`, `-0`            |

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
  set: new Set(["a", "b", "c"]),
  map: new Map([["key", "value"]]),
};

// Encode to JSON-compatible format
const encoded = encode(data);
// Result: { date: { $$date: "2025-01-01T00:00:00.000Z" }, set: { $$set: ["a", "b", "c"] }, map: { $$map: [["key", "value"]] } }

// Decode back to original types
const decoded = decode(encoded);
// decoded.date instanceof Date === true

// Or use stringify/parse for convenience
const jsonString = stringify(data);
const restored = parse(jsonString);
```

### How Codables Extends JSON

Codables uses a tagged format where non-JSON types are wrapped with a `$$` prefix, making the output still human-readable:

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

Codables delivers superior performance compared to alternatives while providing a more developer-friendly API:

### Benchmark Results

**Standard JSON with complex types:**

- **Encode**: Codables 9ms vs SuperJSON 38ms (4.2x faster)
- **Decode**: Codables 7ms vs SuperJSON 10ms (1.4x faster)

**Complex data with references:**

- **Encode**: Codables 8ms vs SuperJSON 35ms (4.4x faster)
- **Decode**: Codables 14ms vs SuperJSON 14ms (equivalent)

**Complex data without references:**

- **Encode**: Codables 9ms vs SuperJSON 37ms (4.1x faster)
- **Decode**: Codables 11ms vs SuperJSON 16ms (1.5x faster)

### Key Advantages

- **4x faster encoding** than SuperJSON for complex data
- **Better TypeScript Integration**: Full type safety with decorator-based class serialization
- **Automatic Class Handling**: No manual serialization logic needed for custom classes
- **Reference Preservation**: Smart circular reference detection and handling
- **Format Safety**: Automatic collision detection and resolution

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
