import type { ReactNode } from "react";

interface IconButtonProps {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  testId?: string;
}

export function IconButton({
  label,
  children,
  onClick,
  disabled,
  active,
  testId,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button${active ? " is-active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-testid={testId}
    >
      {children}
    </button>
  );
}
