import { ArrowRight, Check, Download, ShieldCheck } from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import "./site.css";

const releaseBase =
  "https://github.com/Voldigoade/openbiofigure/releases/download/v0.3.0";

export function DownloadPage() {
  return (
    <main className="product-site download-site">
      <SiteHeader base=".." />
      <section className="download-hero">
        <p className="eyebrow">OpenBioFigure v0.3.0</p>
        <h1>Download for Windows</h1>
        <p>
          Install the offline desktop editor. No account or network connection
          is required after installation.
        </p>
        <a
          className="button primary large"
          href={`${releaseBase}/OpenBioFigure_0.3.0_x64-setup.exe`}
        >
          <Download /> Download Windows installer
        </a>
        <span>Windows 10/11 · x64</span>
      </section>
      <section className="download-details">
        <article>
          <Check />
          <div>
            <h2>Recommended installer</h2>
            <p>
              The setup executable is the simplest option for most Windows
              users.
            </p>
          </div>
        </article>
        <article>
          <ShieldCheck />
          <div>
            <h2>Built in public CI</h2>
            <p>
              Official files are built on a clean GitHub-hosted runner from the
              tagged public commit.
            </p>
            <a href="../docs/developers/verify-release">
              Verify checksums and attestations <ArrowRight />
            </a>
          </div>
        </article>
        <article>
          <Download />
          <div>
            <h2>Advanced deployment</h2>
            <p>
              An MSI package and all provenance files remain available on GitHub
              Releases.
            </p>
            <a href="https://github.com/Voldigoade/openbiofigure/releases/tag/v0.3.0">
              View all v0.3.0 files <ArrowRight />
            </a>
          </div>
        </article>
      </section>
    </main>
  );
}
