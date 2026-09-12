import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";

const elementoRaiz = document.getElementById("root");

if (!elementoRaiz) {
  throw new Error(
    "No se encontró el elemento root de la aplicación"
  );
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);