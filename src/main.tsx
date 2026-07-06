import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { registerAppServiceWorker } from "./shared/pwa/sw-updates";
import "react-toastify/dist/ReactToastify.css";
import "./styles/global.css";

window.__alamcenBooted = true;

try {
  registerAppServiceWorker();
} catch (error) {
  console.warn("[alamcen-pwa] Error durante el bootstrap del service worker.", error);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
