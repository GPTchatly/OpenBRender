import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "../ui/IconButton";
import { useDialogBehavior } from "./useDialogBehavior";

export interface CommandAction {
  id: string;
  label: string;
  description: string;
  group: "Document" | "Create" | "View" | "Export" | "Application";
  keywords?: string[];
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  actions: CommandAction[];
  onClose: () => void;
}

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFKD");
}

function matchScore(action: CommandAction, term: string) {
  const label = normalize(action.label);
  if (label.startsWith(term)) return 0;
  if (label.includes(term)) return 1;
  if (
    (action.keywords ?? []).some((keyword) => normalize(keyword).includes(term))
  )
    return 2;
  return normalize(action.description).includes(term) ? 3 : -1;
}

export function CommandPalette({ actions, onClose }: CommandPaletteProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  useDialogBehavior(dialogRef, onClose);

  const results = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return actions;
    return actions
      .map((action) => ({ action, score: matchScore(action, term) }))
      .filter(({ score }) => score >= 0)
      .sort((left, right) => left.score - right.score)
      .map(({ action }) => action);
  }, [actions, query]);

  useEffect(() => setActiveIndex(0), [query]);

  const run = (action: CommandAction) => {
    onClose();
    action.run();
  };

  return (
    <div className="dialog-backdrop command-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="dialog command-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-title"
      >
        <div className="command-search">
          <Search aria-hidden="true" />
          <label className="visually-hidden" htmlFor="command-query">
            Search commands
          </label>
          <input
            id="command-query"
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={results[activeIndex]?.id}
            placeholder="Search actions…"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) =>
                  Math.min(index + 1, results.length - 1),
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(0, index - 1));
              } else if (event.key === "Enter" && results[activeIndex]) {
                event.preventDefault();
                run(results[activeIndex]);
              }
            }}
          />
          <IconButton label="Close commands" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <h2 id="command-title" className="visually-hidden">
          Quick actions
        </h2>
        <div
          id="command-results"
          className="command-results"
          role="listbox"
          aria-label="Available commands"
        >
          {results.length ? (
            results.map((action, index) => (
              <button
                id={action.id}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                className={activeIndex === index ? "is-active" : undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => run(action)}
                key={action.id}
              >
                <span>
                  <strong>{action.label}</strong>
                  <small>{action.description}</small>
                </span>
                <span className="command-meta">
                  {action.shortcut && <kbd>{action.shortcut}</kbd>}
                  <em>{action.group}</em>
                </span>
              </button>
            ))
          ) : (
            <div className="command-empty">
              <strong>No matching action</strong>
              <span>Try “asset”, “export”, “text”, or “settings”.</span>
            </div>
          )}
        </div>
        <footer className="command-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> Navigate
          </span>
          <span>
            <kbd>Enter</kbd> Run
          </span>
          <span>
            <kbd>Esc</kbd> Close
          </span>
        </footer>
      </section>
    </div>
  );
}
