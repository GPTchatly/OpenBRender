import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyAppearancePreferences, loadPreferences } from "./domain/preferences/preferences";
import "./design-system.css";
import "./styles.css";
import "./product-surfaces.css";
import "./print.css";

applyAppearancePreferences(loadPreferences(window.localStorage));
await Promise.all([
  document.fonts.load('400 16px "Barlow"'),
  document.fonts.load('500 16px "Barlow"'),
  document.fonts.load('600 16px "Barlow"'),
  document.fonts.load('600 16px "Barlow Semi Condensed"'),
  document.fonts.load('400 16px "IBM Plex Sans"'),
  document.fonts.load('500 16px "IBM Plex Sans"'),
  document.fonts.load('600 16px "IBM Plex Sans"'),
  document.fonts.load('500 16px "IBM Plex Mono"'),
  document.fonts.load('400 16px "STIX Two Text"', "DNA αβ"),
  document.fonts.load('600 16px "STIX Two Text"', "DNA αβ"),
]);
createRoot(document.getElementById("root")!).render(<App />);
// Offline installation awaits digest-checked manifests and a safe update lifecycle.
