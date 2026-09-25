import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { lab } from "./state/lab";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

lab.log("info", "system", "Quiz Hack Lab ready — local Mock Server / authorized APIs only.");
lab.start();
