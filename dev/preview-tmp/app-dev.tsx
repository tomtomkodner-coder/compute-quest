import "../src/styles.css";
import { createRoot } from "react-dom/client";
import { MecchaGame } from "../src/components/MecchaGame";
createRoot(document.getElementById("app")!).render(<MecchaGame />);
