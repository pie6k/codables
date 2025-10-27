import * as prettierPluginBabel from "prettier/plugins/babel";
import * as prettierPluginEstree from "prettier/plugins/estree";

import { useCallback, useEffect, useState } from "react";

import { Coder } from "codables";
import { Editor } from "@monaco-editor/react";
import prettier from "prettier/standalone";
import styled from "styled-components";

const EDITOR_FONT_SIZE = 13;

// Shared Monaco editor options
const sharedEditorOptions = {
  minimap: { enabled: false },
  fontSize: EDITOR_FONT_SIZE,
  fontFamily:
    "Roboto Mono, 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  roundedSelection: false,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  theme: "vs-dark",
  lineNumbers: "off" as const,
};

const Container = styled.div`
  display: flex;
  height: 100vh;
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "Roboto",
    sans-serif;
  background: #1e1e1e;
  color: #d4d4d4;
`;

const Panel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #3c3c3c;

  &:last-child {
    border-right: none;
  }
`;

const PanelHeader = styled.div`
  padding: 8px 16px;
  background: #1e1e1e;
  border-bottom: 1px solid #3c3c3c;
  font-weight: 600;
  font-size: ${EDITOR_FONT_SIZE + 2}px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #cccccc;
  min-height: 36px;
`;

const ExampleButton = styled.button`
  background: #3c3c3c;
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: ${EDITOR_FONT_SIZE - 1}px;
  font-weight: 500;
  color: #cccccc;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;

  &:hover {
    background: #4a4a4a;
  }

  &:active {
    background: #2a2a2a;
  }
`;

const EditorContainer = styled.div`
  flex: 1;
  position: relative;
`;

const OutputContainer = styled.div`
  flex: 1;
  background: #1e1e1e;
  overflow: hidden;
  font-size: ${EDITOR_FONT_SIZE}px;
`;

const ErrorMessage = styled.div`
  color: #f48771;
  background: #5a1a1a;
  border: 1px solid #8b4513;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: ${EDITOR_FONT_SIZE}px;
`;

const ErrorContainer = styled.div`
  padding: 12px;
  background: #1e1e1e;
`;

const BUILT_IN_TYPES = `// Some of the built-in JavaScript types that get encoded

const item = { foo: 1 };

return {
  date: new Date("2025-01-01T00:00:00.000Z"),
  regexp2: /hello world/,
  regexp: /hello world/gi,
  error: new Error("Something went wrong", { cause: "404" }),
  url: new URL("https://example.com/path?query=value"),
  urlSearchParams: new URLSearchParams("query=value&another=value"),
  bigint: 1234567890123456789n,
  symbol: Symbol.for("test"),
  undefined: undefined,
  // None of those are handled by normal JSON.stringify
  specialNumbers: [Infinity, -Infinity, -0, NaN],
  someData: new Uint8Array([1, 2, 3, 4, 5]),
  set: new Set([1, 2, 3]),
  map: new Map([[1, 1], [2, 2]]),
  sameRefs: [item, item, item]
}`;

const CIRCULAR_REFERENCES = `// Objects with circular references

const root = { name: "Parent", children: [] };
const child1 = { name: "Child 1", parent: null };
const child2 = { name: "Child 2", parent: null };

child1.parent = root;
child2.parent = root;
root.children = [child1, child2];

// Self-referencing object
const selfRef = { name: "Self", ref: null };
selfRef.ref = selfRef;

return {
  root: root,
  selfReference: selfRef
}`;

const PLAIN_JSON = `// Regular JSON will not be changed at all

return {
  string: "Hello, World!",
  number: 42,
  boolean: true,
  null: null,
  array: [1, 2, 3, "four", true],
  object: {
    nested: {
      deeply: {
        value: "nested value"
      }
    },
    array: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" }
    ]
  }
}`;

const CUSTOM_TYPES = `// You can define custom types

// First, define your custom classes
class Product {
  // Note that we can use complex data structures like sets and maps
  // it will automatically be encoded with no configuration needed
  constructor(id, pricesMap) {
    this.id = id;
    this.prices = pricesMap;
  }
}

class User {
  constructor(name, productsInBucketSet) {
    this.name = name;
    this.bucket = productsInBucketSet;
  }
}

// Now, explain how to encode and decode your custom types
coder.addType(
  "User", // Name of the type
  (value) => value instanceof User, // How to check if a value is an instance of your custom class
  (value) => ({ name: value.name, bucket: value.bucket }), // How to encode the value
  (data) => new User(data.name, data.bucket), // How to decode the value
);

coder.addType(
  "Product",
  (value) => value instanceof Product,
  (value) => ({ id: value.id, prices: value.prices }),
  (data) => new Product(data.id, data.prices),
);

// Now, let's define some data

const tv = new Product("1", new Map([["USD", 99.99]]));
const phone = new Product("2", new Map([["USD", 149.99]]));
const computer = new Product("3", new Map([["USD", 199.99]]));

// Note that we repeat the same product reference in the bucket of both users
const userA = new User("A", new Set([tv, computer]));
const userB = new User("B", new Set([tv, phone]));

const data = {
  products: [tv, phone, computer],
  users: [userA, userB],
};

return data;`;

const examples: Record<string, string> = {
  "Built-in Types": BUILT_IN_TYPES,
  "Plain JSON": PLAIN_JSON,
  "Circular References": CIRCULAR_REFERENCES,
  "Custom Types": CUSTOM_TYPES,
};

const defaultCode = examples["Built-in Types"];

async function getResultForCode(code: string) {
  const coder = new Coder();
  const result = eval(`(function() { ${code} })()`);
  const encoded = coder.encode(result);

  const jsonString = JSON.stringify(encoded);

  try {
    // Format the JSON with Prettier using Babel parser
    const formatted = await prettier.format(jsonString, {
      parser: "json",
      plugins: [
        //
        prettierPluginBabel,
        // @ts-ignore
        prettierPluginEstree,
      ],
      printWidth: 50,
      tabWidth: 2,
      useTabs: false,
    });

    return formatted;
  } catch (error) {
    // If Prettier fails, fall back to basic JSON.stringify
    console.warn("Prettier formatting failed:", error);
    return JSON.stringify(encoded, null, 2);
  }
}

function App() {
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const evaluateCode = useCallback(async (inputCode: string) => {
    try {
      // Encode the result using codables
      const encoded = await getResultForCode(inputCode);
      setOutput(encoded);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setOutput("");
    }
  }, []);

  // Initialize output with default code
  useEffect(() => {
    evaluateCode(defaultCode);
  }, []);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const newCode = value || "";
      setCode(newCode);
      evaluateCode(newCode);
    },
    [evaluateCode],
  );

  const handleExampleClick = useCallback(
    (exampleCode: string) => {
      setCode(exampleCode);
      evaluateCode(exampleCode);
    },
    [evaluateCode],
  );

  return (
    <Container>
      <Panel>
        <PanelHeader>
          Input
          {Object.entries(examples).map(([name, exampleCode]) => (
            <ExampleButton
              key={name}
              onClick={() => handleExampleClick(exampleCode)}
            >
              {name}
            </ExampleButton>
          ))}
        </PanelHeader>
        <EditorContainer>
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={code}
            onChange={handleEditorChange}
            options={{
              ...sharedEditorOptions,
            }}
          />
        </EditorContainer>
      </Panel>

      <Panel>
        <PanelHeader>Encoded</PanelHeader>
        <OutputContainer>
          {error && (
            <ErrorContainer>
              <ErrorMessage>{error}</ErrorMessage>
            </ErrorContainer>
          )}

          <Editor
            height="100%"
            defaultLanguage="json"
            value={output || "// Output will appear here..."}
            options={{
              ...sharedEditorOptions,
              readOnly: true,
              wordWrap: "off",
              folding: true,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
            }}
          />
        </OutputContainer>
      </Panel>
    </Container>
  );
}

export default App;
