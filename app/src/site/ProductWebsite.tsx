import {
  ArrowRight,
  Check,
  Download,
  Github,
  LockKeyhole,
  Shapes,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import "./site.css";

const features = [
  [
    Shapes,
    "Editable by default",
    "Compose text, shapes, arrows, panels, charts, and vector scientific assets.",
  ],
  [
    Sparkles,
    "Scientific assets that explain themselves",
    "Search a verified offline catalog and keep provenance attached to every placed asset.",
  ],
  [
    LockKeyhole,
    "Local-first work",
    "No account, telemetry, or mandatory cloud service. Save and export on your device.",
  ],
] as const;

export function ProductWebsite() {
  return (
    <main className="product-site">
      <SiteHeader />
      <section className="site-hero">
        <div>
          <p className="eyebrow">Open-source scientific figure editor</p>
          <h1>Make scientific figures clear, editable, and attributable.</h1>
          <p className="site-lead">
            OpenBRender helps researchers, students, and educators compose
            publication-ready vector figures with an open scientific asset
            library and built-in provenance tracking.
          </p>
          <div className="site-actions">
            <a className="button primary large" href="./app/">
              Open the web app <ArrowRight />
            </a>
            <a className="button large" href="./download/">
              <Download /> Download for Windows
            </a>
          </div>
          <ul className="site-trust" aria-label="Product principles">
            {["No account required", "Works offline", "Apache-2.0 code"].map(
              (item) => (
                <li key={item}>
                  <Check />
                  {item}
                </li>
              ),
            )}
          </ul>
        </div>
        <div
          className="product-frame"
          aria-label="OpenBRender editor overview"
        >
          <div className="product-frame-bar">
            <span />
            <span />
            <span />
            <b>Untitled figure</b>
          </div>
          <aside>
            <strong>Scientific assets</strong>
            <i />
            <i />
            <i />
          </aside>
          <div className="product-canvas">
            <span>A</span>
            <div className="cell-preview" />
            <div className="arrow-preview" />
            <p>Cell response</p>
          </div>
          <section>
            <strong>Properties</strong>
            <i />
            <i />
            <strong>Layers</strong>
            <i />
          </section>
        </div>
      </section>

      <section className="site-proof" id="features">
        <p className="eyebrow">One focused workflow</p>
        <h2>From first idea to an editable export.</h2>
        <div className="feature-lines">
          {features.map(([Icon, title, detail]) => (
            <article key={title}>
              <Icon />
              <div>
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="site-publication">
        <div>
          <p className="eyebrow">Publication-aware</p>
          <h2>Keep licensing context with the figure.</h2>
        </div>
        <div className="publication-check">
          <strong>Publication check</strong>
          <p>
            <Check /> Provenance complete
          </p>
          <p>
            <Check /> Required attribution generated
          </p>
          <small>
            OpenBRender tracks metadata; it does not provide legal advice.
          </small>
        </div>
      </section>

      <section className="site-cta">
        <h2>Start with a template. Stay in control of every object.</h2>
        <div>
          <a className="button primary large" href="./app/">
            Open app <ArrowRight />
          </a>
          <a
            className="button quiet large"
            href="https://github.com/Voldigoade/openbiofigure"
          >
            <Github /> View source
          </a>
        </div>
      </section>
      <footer>
        <strong>OpenBRender</strong>
        <nav>
          <a href="./docs/">Docs</a>
          <a href="https://github.com/Voldigoade/openbiofigure/releases">
            Releases
          </a>
          <a href="https://github.com/Voldigoade/openbiofigure/security/policy">
            Security
          </a>
          <a href="https://github.com/Voldigoade/openbiofigure/blob/main/CONTRIBUTING.md">
            Contributing
          </a>
          <a href="https://github.com/Voldigoade/openbiofigure/blob/main/LICENSE">
            License
          </a>
        </nav>
      </footer>
    </main>
  );
}
