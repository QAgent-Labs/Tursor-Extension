/** Shared primary CTA — gradient, radius, padding, shadow. */
export const tursorPrimaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_6px_20px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_8px_24px_rgba(99,102,241,0.38)] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm";

export const tursorPrimaryButtonFullWidthClassName = `w-full ${tursorPrimaryButtonClassName}`;

/** Half-width wrapper for centered form CTAs. */
export const tursorPrimaryButtonHalfWrapperClassName = "w-1/2 min-w-[9rem]";

/** Secondary action — same radius and padding as primary. */
export const tursorSecondaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm";

export const tursorSecondaryButtonFullWidthClassName = `w-full ${tursorSecondaryButtonClassName}`;

/** Compact icon action — same radius and colors as primary. */
export const tursorPrimaryIconButtonClassName =
  "inline-flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 p-2.5 text-white shadow-[0_6px_20px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_8px_24px_rgba(99,102,241,0.38)] disabled:cursor-not-allowed disabled:opacity-40";

/** Compact icon action — same radius as secondary. */
export const tursorSecondaryIconButtonClassName =
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-600 bg-slate-800/80 p-2.5 text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40";
