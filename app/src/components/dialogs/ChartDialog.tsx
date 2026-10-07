import { BarChart3, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  validateChartSpec,
  type ChartKind,
  type ChartSpec,
} from "../../domain/charts/chart";
import { FormField } from "../ui/FormField";
import { IconButton } from "../ui/IconButton";
import { useDialogBehavior } from "./useDialogBehavior";

interface ChartDialogProps {
  onClose: () => void;
  onCreate: (spec: ChartSpec) => void | Promise<void>;
}

export function ChartDialog({ onClose, onCreate }: ChartDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogBehavior(dialogRef, onClose);
  const [kind, setKind] = useState<ChartKind>("bar");
  const [title, setTitle] = useState("Experimental results");
  const [labels, setLabels] = useState("Control, Treatment A, Treatment B");
  const [values, setValues] = useState("12, 24, 18");
  const spec = useMemo<ChartSpec>(
    () => ({
      kind,
      title,
      labels: labels.split(",").map((value) => value.trim()),
      values: values.split(",").map((value) => Number(value.trim())),
    }),
    [kind, labels, title, values],
  );
  const error = validateChartSpec(spec);

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="dialog chart-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-dialog-title"
      >
        <div className="dialog-header">
          <div>
            <h2 id="chart-dialog-title">Create a chart</h2>
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <div className="chart-kind-picker" aria-label="Chart type">
          {(["bar", "line"] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={kind === value ? "active" : undefined}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              <BarChart3 aria-hidden="true" />
              {value === "bar" ? "Bar chart" : "Line chart"}
            </button>
          ))}
        </div>
        <div className="dialog-fields">
          <FormField label="Chart title">
            <input
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
          </FormField>
          <FormField label="Labels (comma separated)">
            <input
              value={labels}
              onChange={(event) => setLabels(event.currentTarget.value)}
            />
          </FormField>
          <FormField label="Values (comma separated)">
            <input
              value={values}
              onChange={(event) => setValues(event.currentTarget.value)}
            />
          </FormField>
        </div>
        <p
          className={error ? "form-message error" : "form-message"}
          role="status"
        >
          {error ??
            `${spec.values.length} data points · editable after insertion`}
        </p>
        <div className="dialog-actions">
          <button className="button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            type="button"
            disabled={Boolean(error)}
            onClick={() => void onCreate(spec)}
          >
            Create chart
          </button>
        </div>
      </section>
    </div>
  );
}
