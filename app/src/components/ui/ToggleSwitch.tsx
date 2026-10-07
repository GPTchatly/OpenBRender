interface ToggleSwitchProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({ checked, label, onChange }: ToggleSwitchProps) {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span aria-hidden="true" />
    </label>
  );
}
