import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ShowcaseApp } from "./ShowcaseApp";
import "../styles.css";
import "./showcase.css";

createRoot(document.getElementById("root")!).render(<StrictMode><ShowcaseApp /></StrictMode>);
