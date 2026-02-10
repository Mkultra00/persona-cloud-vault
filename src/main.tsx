import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Force clean module resolution
createRoot(document.getElementById("root")!).render(<App />);
