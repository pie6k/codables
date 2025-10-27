import "./root.css";

import App from "./App.tsx";
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root")!);

root.render(<App />);
