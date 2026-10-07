import { Github } from "lucide-react";
import { Brand } from "../app/Brand";

export function SiteHeader({ base = "." }: { base?: "." | ".." }) {
  return (
    <header className="site-header">
      <a
        className="site-brand-link"
        href={`${base}/`}
        aria-label="OpenBRender home"
      >
        <Brand compact />
      </a>
      <nav aria-label="Primary navigation">
        <a href={`${base}/#features`}>Features</a>
        <a href={`${base}/docs/`}>Docs</a>
        <a href={`${base}/download/`}>Download</a>
        <a href="https://github.com/Voldigoade/openbiofigure">
          <Github aria-hidden="true" /> GitHub
        </a>
      </nav>
      <a className="button primary" href={`${base}/app/`}>
        Open app
      </a>
    </header>
  );
}
