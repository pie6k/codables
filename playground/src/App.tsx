import * as prettierPluginBabel from "prettier/plugins/babel";
import * as prettierPluginEstree from "prettier/plugins/estree";

import { useCallback, useEffect, useState } from "react";

import { Editor } from "@monaco-editor/react";
import { encode } from "codables";
import prettier from "prettier/standalone";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  height: 100vh;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
`;

const Panel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e1e4e8;

  &:last-child {
    border-right: none;
  }
`;

const PanelHeader = styled.div`
  padding: 12px 16px;
  background: #f6f8fa;
  border-bottom: 1px solid #e1e4e8;
  font-weight: 600;
  font-size: 14px;
`;

const EditorContainer = styled.div`
  flex: 1;
  position: relative;
`;

const OutputContainer = styled.div`
  flex: 1;
  background: #fafbfc;
  overflow: auto;
  font-size: 14px;
`;

const ErrorMessage = styled.div`
  color: #d73a49;
  background: #ffeef0;
  border: 1px solid #f97583;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 14px;
`;

const OutputCode = styled.pre`
  background: #ffffff;
  padding: 16px;
  margin: 0;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
`;

const defaultCode = `// Welcome to playground!

// Here we define some object with repeating references
const optionA = { label: "Foo" };
const optionB = { label: "Bar" };

const select = {
    options: new Map([["Foo", optionA], ["Bar", optionB]]),
    selected: optionA
}

return {
  // Regular JSON objects stay untouched
  some: {
    normal: ["json", "stays", "untouched"]
  },
  // Custom types will be properly encoded
  date: new Date(),
  regexp: /foo/i,
  error: new Error("Something went wrong", {cause: "404"}),
  url: new URL("https://google.com/"),
  misc: [
    new Uint8Array([1,2,3]),
    NaN,
    Infinity,
    -Infinity,
    -0,
    200n
  ],
  nope: undefined,
  select,
}`;

async function getResultForCode(code: string) {
  const result = eval(`(function() { ${code} })()`);
  const encoded = encode(result);

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
  const [error, setError] = useState("");

  const evaluateCode = useCallback(async (inputCode: string) => {
    try {
      setError("");
      // Encode the result using codables
      const encoded = await getResultForCode(inputCode);
      setOutput(encoded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setOutput("");
    }
  }, []);

  // Initialize output with default code
  useEffect(() => {
    evaluateCode(defaultCode);
  }, [evaluateCode]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const newCode = value || "";
      setCode(newCode);
      evaluateCode(newCode);
    },
    [evaluateCode],
  );

  return (
    <Container>
      <Panel>
        <PanelHeader>Input</PanelHeader>
        <EditorContainer>
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={code}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </EditorContainer>
      </Panel>

      <Panel>
        <PanelHeader>Encoded</PanelHeader>
        <OutputContainer>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <OutputCode>{output || "// Output will appear here..."}</OutputCode>
        </OutputContainer>
      </Panel>
    </Container>
  );
}

export default App;
