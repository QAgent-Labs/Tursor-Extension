/** Raw gradient + clip (safe on flex buttons; box may span full width). */
const tursorWordmarkGradientCore =
  "bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent";

/**
 * Gradient fill only — same colors as `TursorHeader.tsx` uses on controls.
 * (No `inline-block` / `w-fit` here: avoids breaking `display: flex` on the Home button.)
 */
export const tursorWordmarkGradientClassName = tursorWordmarkGradientCore;

/**
 * Use on headings / wordmarks: shrink the background box to the text so the gradient
 * runs from the first glyph to the last.
 */
export const tursorWordmarkTextGradientClassName = `inline-block w-fit max-w-full ${tursorWordmarkGradientCore}`;

/**
 * Full title row: size + weight + gradient clipped to glyph bounds (Run page rail, etc.).
 */
export const tursorHeaderTitleClassName = `text-4xl font-bold ${tursorWordmarkTextGradientClassName}`;
