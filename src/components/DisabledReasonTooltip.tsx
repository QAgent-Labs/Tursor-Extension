import type { ReactElement } from "react";

type Props = {
  disabled: boolean;
  reason: string | null | undefined;
  children: ReactElement;
  className?: string;
};

/**
 * Wraps controls that may be disabled so hover still shows why (disabled
 * elements do not receive pointer events).
 */
export function DisabledReasonTooltip({
  disabled,
  reason,
  children,
  className,
}: Props) {
  const showTip = disabled && reason;

  return (
    <span
      className={`group/disabled-tip relative inline-flex ${className ?? ""}`}
    >
      {children}
      {showTip ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[18rem] -translate-x-1/2 rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1.5 text-left text-xs leading-snug text-slate-200 opacity-0 shadow-lg transition-opacity duration-150 group-hover/disabled-tip:opacity-100 group-focus-within/disabled-tip:opacity-100"
        >
          {reason}
        </span>
      ) : null}
    </span>
  );
}
