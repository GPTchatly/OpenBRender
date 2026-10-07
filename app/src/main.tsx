import { createRoot } from "react-dom/client";
import {
  applyAppearancePreferences,
  loadPreferences,
} from "./domain/preferences/preferences";
import "./design-system.css";
import "./styles.css";
import "./product-surfaces.css";
import { registerServiceWorker } from "./registerServiceWorker";

applyAppearancePreferences(loadPreferences(window.localStorage));
const root = createRoot(document.getElementById("root")!);
const path = window.location.pathname.replace(/\/+$/, "");
const desktop = "__TAURI_INTERNALS__" in window;

if (desktop || path.endsWith("/app")) {
  document.title = "Editor — OpenBioFigure";
  void import("./App").then(({ App }) => root.render(<App />));
} else if (path.endsWith("/download")) {
  document.title = "Download — OpenBioFigure";
  void import("./site/DownloadPage").then(({ DownloadPage }) =>
    root.render(<DownloadPage />),
  );
} else {
  document.title = "OpenBioFigure — Scientific figure editor";
  void import("./site/ProductWebsite").then(({ ProductWebsite }) =>
    root.render(<ProductWebsite />),
  );
}
registerServiceWorker();
