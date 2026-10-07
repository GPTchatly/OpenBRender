interface BrandProps {
  compact?: boolean;
}

/** A drawing sheet with its title block: the OpenBRender mark. */
export function BrandGlyph() {
  return (
    <svg
      className="brand-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <rect x="2.8" y="2.8" width="18.4" height="18.4" />
      <path d="M11.5 21.2v-6.4h9.7M11.5 18h9.7M16.4 14.8v6.4" />
      <path d="M6.2 6.2h6.4" strokeWidth="1.2" />
    </svg>
  );
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <div className={`brand-mark${compact ? " is-compact" : ""}`}>
      <BrandGlyph />
      <strong>
        Open<span>B</span>Render
      </strong>
      {!compact && <span className="version">Rev 0.1.0</span>}
    </div>
  );
}
