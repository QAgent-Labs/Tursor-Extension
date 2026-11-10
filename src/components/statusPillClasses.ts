/** Shared run-status pills — solid green / red, white text and icons. */
const pillBase =
  'inline-flex shrink-0 items-center gap-1 rounded-full border font-medium text-white shadow-lg shadow-black/30';

export const statusPillSuccessClass = `${pillBase} border-emerald-400/60 bg-emerald-600 px-2 py-0.5 text-[10px]`;

export const statusPillFailureClass = `${pillBase} border-red-400/60 bg-red-600 px-2 py-0.5 text-[10px]`;

/** Larger variant for overlays on a full screenshot. */
export const statusPillSuccessLargeClass = `${pillBase} border-emerald-400/60 bg-emerald-600 px-2.5 py-1 text-[11px]`;

export const statusPillFailureLargeClass = `${pillBase} border-red-400/60 bg-red-600 px-2.5 py-1 text-[11px]`;

export const statusPillIconClass = 'h-3 w-3 text-white';
