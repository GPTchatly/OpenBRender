import { X } from "lucide-react";
import { useRef } from "react";
import { IconButton } from "../ui/IconButton";
import { useDialogBehavior } from "./useDialogBehavior";

interface KeyboardShortcutsDialogProps {
  onClose: () => void;
}

const shortcuts = [
  ["New figure", "Ctrl N"],
  ["Open project", "Ctrl O"],
  ["Save project", "Ctrl S"],
  ["Quick actions", "Ctrl K"],
  ["Undo / redo", "Ctrl Z / Ctrl Y"],
  ["Copy / paste", "Ctrl C / Ctrl V"],
  ["Duplicate", "Ctrl D"],
  ["Group / ungroup", "Ctrl G / Ctrl Shift G"],
  ["Delete selection", "Delete"],
  ["Nudge selection", "Arrow keys / Shift 10 px"],
  ["Pan canvas", "Hold Space"],
  ["Fit to screen", "0"],
] as const;

export function KeyboardShortcutsDialog({
  onClose,
}: KeyboardShortcutsDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogBehavior(dialogRef, onClose);
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="dialog shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="dialog-header">
          <div>
            <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <dl className="shortcut-list">
          {shortcuts.map(([label, keys]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {keys.split(" ").map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <div className="dialog-actions">
          <button className="button primary" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
