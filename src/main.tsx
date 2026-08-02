import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { HashRouter } from "react-router-dom";
import { TursorWebSocketProvider } from "./context/TursorWebSocketProvider";
import { TursorAppConfigProvider } from "./context/TursorAppConfigProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <TursorAppConfigProvider>
        <TursorWebSocketProvider>
          <App />
        </TursorWebSocketProvider>
      </TursorAppConfigProvider>
    </HashRouter>
  </StrictMode>,
);
