# Codables

High-performance, no-dependencies, extensible, and declarative "anything to/from JSON" serializer.

Throw your data at it - [open playground](https://codableslib.com/playground/)

[Read the docs](https://codableslib.com/docs)

- **High-performance**: ~3x faster than SuperJSON ([see benchmark](https://codableslib.com/docs/performance))
- **Extensible**: By default handles almost every built-in JavaScript type. Easy to extend with custom handled types.
- **Declarative**: Modern decorators allowing you to mark "what to serialize", not "how to serialize it"
- **Zero dependencies**: Fully standalone, no external dependencies. 7.3KB gziped.
- **Type Safety**: Full TypeScript support with autocompletion and type inference
- **Well tested**: Every feature is covered by tests. It passes most of SuperJSON tests moved into Codables (including plenty of edge cases)
- **Framework agnostic**: Works with any JavaScript/TypeScript project
- **Secure**: Built-in protection against prototype pollution

# Quick Examples

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

Eliminate the dual-format problem with modern decorators:

```typescript
import { codableClass, codable, Coder } from "codables";

@codableClass("Player")
class Player {
  @codable() name: string;
  @codable() score: number;

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

# Key Features

- **🚀 High Performance**: ~3x faster encoding and ~2x faster decoding than SuperJSON
- **🔒 Type Safety**: Full TypeScript support with compile-time checking and autocompletion
- **🔄 Reference Preservation**: Handles circular references and maintains object identity automatically
- **🛡️ Security**: Built-in protection against prototype pollution attacks
- **🎯 Zero Boilerplate**: No manual conversion logic or separate data interfaces required
- **🔧 Extensible**: Easy to add custom serialization types with `createCoderType`
- **📦 Lightweight**: Modular imports - use only what you need (7.3KB gzipped)
- **🌐 Framework Agnostic**: Works with any JavaScript/TypeScript project
- **✅ Well Tested**: Comprehensive test coverage including edge cases

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

# Use Cases

Perfect for applications that need to serialize complex data:

- **Full-stack Applications**: Seamlessly pass rich objects between client and server
- **State Management**: Persist complex state with types preserved
- **API Communication**: Send/receive data with native JavaScript types
- **Database Storage**: Store complex objects while maintaining type information
- **Real-time Applications**: Efficient serialization for WebSocket/SSE communication
- **Development Tools**: Serialize debugging information with full type fidelity

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

## Class Serialization

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

```typescript
import { createCoderType, Coder } from "codables";

const $$custom = createCoderType(
  "CustomType",
  (value) => value instanceof CustomType,
  (instance) => instance.data,
  (data) => new CustomType(data),
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

## vs SuperJSON

| Feature           | Codables                                     | SuperJSON                     |
| ----------------- | -------------------------------------------- | ----------------------------- |
| **Performance**   | 3-4x faster encoding, 1.5-2x faster decoding | Baseline                      |
| **Class Support** | Built-in decorator framework                 | Manual serialization required |
| **Format**        | Tagged format (`{ $$Date: "..." }`)          | SuperJSON format              |
| **Bundle Size**   | Smaller core, modular imports                | Monolithic                    |
| **Type Safety**   | Full TypeScript support                      | Good TypeScript support       |

## Migration from SuperJSON

```typescript
// Before
import { SuperJSON } from "superjson";
const serialized = SuperJSON.stringify(data);
const deserialized = SuperJSON.parse(serialized);

// After
import { stringify, parse } from "codables";
const serialized = stringify(data);
const deserialized = parse(serialized);
```

[Read complete comparison guide →](https://codableslib.com/docs/comparisons)

# Installation

```bash
npm install codables
yarn add codables
pnpm add codables
```

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
