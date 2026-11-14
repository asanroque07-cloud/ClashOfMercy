// This is the app's entry point — the very first file the browser runs.
// It finds the <div id="root"> in index.html and tells React to draw the
// whole game (the <App /> component) inside it. index.css loads the styles.
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(<App />);
