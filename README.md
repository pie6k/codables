# Codables

High-performance, no-dependencies, extensible, and declarative "anything to/from JSON" serializer.

Throw your data at it - [open playground](https://codableslib.com/playground/)

[Read the docs](https://codableslib.com/docs)

## Key Features

- **High-performance**: ~3x faster than SuperJSON ([see benchmark](https://codableslib.com/docs/performance))
- **Extensible**: By default handles almost every built-in JavaScript type. Easy to extend with custom handled types.
- **Declarative**: Modern decorators allowing you to mark "what to serialize", not "how to serialize it"
- **Zero dependencies**: Fully standalone, no external dependencies. 7.3KB gziped.
- **Type Safety**: Full TypeScript support with autocompletion and type inference
- **Well tested**: Every feature is covered by tests. It passes most of SuperJSON tests moved into Codables (including plenty of edge cases)
- **Framework agnostic**: Works with any JavaScript/TypeScript project
- **Secure**: Built-in protection against prototype pollution

# Installation

```bash
npm install codables
yarn add codables
pnpm add codables
```

# Quick start

## JSON Serialization

Extend JSON to handle JavaScript types that JSON can't serialize:

```typescript
import { encode, decode } from "codables";

const data = {
  date: new Date("2025-01-01"),
  set: new Set(["a", "b", "c"]),
  map: new Map([["key", "value"]]),
  bigint: BigInt("1234567890123456789"),
  regex: /hello/gi,
  url: new URL("https://example.com"),
};

const encoded = encode(data);
// {
//   date: { $$Date: "2025-01-01T00:00:00.000Z" },
//   set: { $$Set: ["a", "b", "c"] },
//   map: { $$Map: [["key", "value"]] },
//   bigint: { $$BigInt: "1234567890123456789" },
//   regex: { $$RegExp: ["hello", "gi"] },
//   url: { $$URL: "https://example.com/" }
// }

const decoded = decode(encoded);
// decoded.date instanceof Date === true
// decoded.set instanceof Set === true
// All types preserved!
```

## Declarative Class Serialization

Eliminate the dual-format problem with modern decorators

### What declarative means here?

It means you mark "what to serialize", not "how to serialize it"

```typescript
import { codableClass, codable, Coder } from "codables";

@codableClass("Player")
class Player {
  @codable() name: string;
  @codable() score: number;

  // Note: constructor is not needed for Codables to work, it is here for convenience of creating instances.
  constructor(data: Pick<Player, "name" | "score">) {
    this.name = data.name;
    this.score = data.score;
  }
}

@codableClass("GameState")
class GameState {
  @codable() players: Set<Player> = new Set();
  @codable() createdAt = new Date();
  @codable() activePlayer: Player | null = null;

  addPlayer(player: Player) {
    this.players.add(player);
    this.activePlayer = player;
  }
}

// Create a custom coder instance
const coder = new Coder([GameState]);

// Use your classes naturally
const gameState = new GameState();
gameState.addPlayer(new Player({ name: "Alice", score: 100 }));

// Serialize directly - no conversion logic needed!
const encoded = coder.encode(gameState);
const decoded = coder.decode<GameState>(encoded);
// All types, references, and circular dependencies preserved!
```

# Supported Types

Codables automatically handles JavaScript types that standard JSON cannot serialize:

| JavaScript Type | Example Output                                         |
| --------------- | ------------------------------------------------------ |
| `Date`          | `{ $$Date: "2025-01-01T00:00:00.000Z" }`               |
| `BigInt`        | `{ $$BigInt: "1234567890123456789" }`                  |
| `Set`           | `{ $$Set: ["a", "b", "c"] }`                           |
| `Map`           | `{ $$Map: [["key", "value"]] }`                        |
| `RegExp`        | `{ $$RegExp: ["hello", "gi"] }`                        |
| `Symbol`        | `{ $$Symbol: "test" }`                                 |
| `URL`           | `{ $$URL: "https://example.com/" }`                    |
| `Error`         | `{ $$Error: "Something went wrong" }`                  |
| `undefined`     | `{ $$undefined: null }`                                |
| Typed Arrays    | `{ $$typedArray: { type: "uint8", data: [1, 2, 3] } }` |
| Special Numbers | `{ $$num: "NaN" }`, `{ $$num: "Infinity" }`            |

[Read more about supported types →](https://codableslib.com/docs/json-serialization/supported-types)

# Performance

Codables delivers superior performance compared to alternatives:

- **Encoding**: ~3-3.5x faster than SuperJSON across all data sizes
- **Decoding**: Comparable to or faster than SuperJSON (1.1-1.6x faster)
- **Bundle Size**: Smaller core with modular imports
- **Memory**: Efficient reference handling with optional reference preservation

[View detailed benchmarks →](https://codableslib.com/docs/performance)

# API Overview

## Core Functions

```typescript
import { encode, decode, stringify, parse } from "codables";

// Basic encoding/decoding
const encoded = encode(data);
const decoded = decode(encoded);

// With JSON stringification
const jsonString = stringify(data);
const restored = parse(jsonString);
```

## Declarative Class Serialization

```typescript
import { codableClass, codable, Coder } from "codables";

@codableClass("MyClass")
class MyClass {
  @codable() property: string;
}

const coder = new Coder([MyClass]);
const encoded = coder.encode(instance);
const decoded = coder.decode<MyClass>(encoded);
```

## Custom Types

You can also use lower-level API to create custom types and encode/decode them manually.

```typescript
import { createCoderType, Coder } from "codables";

const $$custom = createCoderType(
  "CustomType", // name of the type
  (value) => value instanceof CustomType, // how to detect some value should be encoded using this type
  (instance) => instance.data, // how to encode the value (might return rich data like `Map` or `Set`, or even other custom types)
  (data) => new CustomType(data), // how to recreate the value from the encoded data
);

const coder = new Coder([$$custom]);
```

# Security

Codables includes built-in security measures:

- **Prototype Pollution Protection**: Automatically filters dangerous properties (`constructor`, `__proto__`, `prototype`)
- **Safe Object Creation**: Creates objects without modifying prototypes
- **Format Safety**: Automatic collision detection and escaping

[Read more about security features →](https://codableslib.com/docs/security)

# Comparisons

## Benchmark vs SuperJSON

You can run these benchmarks yourself by downloading the repository and running `yarn codables bench`. The benchmark code is available in [`benchmark.bench.ts`](https://github.com/adam/codables/blob/main/codables/tests/benchmark.bench.ts).

### Plain JSON Data (6MB)

| Operation  | Preserve refs                      | Copy refs                          |
| ---------- | ---------------------------------- | ---------------------------------- |
| **Encode** | 🟢 **2.87x faster** than SuperJSON | 🟢 **3.64x faster** than SuperJSON |
| **Decode** | 🟢 **1.11x faster** than SuperJSON | 🟢 **1.10x faster** than SuperJSON |

### Complex Data Structures

It includes deeply nested objects, with repeating references, `Sets`, `Maps`, and `Dates`

| Dataset     | Encode              |                     | Decode                        |                     |
| ----------- | ------------------- | ------------------- | ----------------------------- | ------------------- |
|             | **Preserve refs**   | **Copy refs**       | **Preserve refs**             | **Copy refs**       |
| **Small**   | 🟢 **3.39x faster** | 🟢 **3.91x faster** | 🟢 **1.27x faster**           | 🟢 **1.24x faster** |
| **Average** | 🟢 **3.51x faster** | 🟢 **3.99x faster** | 🔵 SuperJSON **1.02x faster** | 🟢 **1.36x faster** |
| **Large**   | 🟢 **3.55x faster** | 🟢 **4.16x faster** | 🔵 SuperJSON **1.01x faster** | 🟢 **1.60x faster** |
| **Huge**    | 🟢 **3.67x faster** | 🟢 **4.16x faster** | 🟢 **1.24x faster**           | 🟢 **1.67x faster** |

## Migration from SuperJSON

```typescript
// Before
import { stringify, parse } from "superjson";
const serialized = stringify(data);
const deserialized = parse(serialized);

// After
import { encode, decode } from "codables";
const serialized = encode(data);
const deserialized = decode(serialized);
```

[Read complete comparison guide →](https://codableslib.com/docs/comparisons)

# Documentation

- **[Quick Start](https://codableslib.com/docs)** - Get up and running quickly
- **[JSON Serialization](https://codableslib.com/docs/json-serialization)** - Handle complex JavaScript types
- **[Declarative Serialization](https://codableslib.com/docs/declarative-serialization)** - Serialize classes with decorators
- **[Performance](https://codableslib.com/docs/performance)** - Benchmark results and optimization
- **[Security](https://codableslib.com/docs/security)** - Security features and best practices
- **[Recipes](https://codableslib.com/docs/recipes)** - Real-world examples and integrations

# Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
