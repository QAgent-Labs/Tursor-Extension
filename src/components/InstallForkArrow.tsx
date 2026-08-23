import { motion } from "motion/react";

const DOT = "rgba(34, 211, 238, 0.85)";
const STROKE = "rgba(34, 211, 238, 0.55)";

/** Dotted fork: center dot → curved arms → vertical stems → ▼ tips (matches install UI reference). */
export function InstallForkArrow() {
  const dash = "2.5 8";
  const draw = {
    fill: "none" as const,
    stroke: STROKE,
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeDasharray: dash,
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-2" aria-hidden>
      <svg
        viewBox="0 0 400 80"
        className="h-[5rem] w-full overflow-visible sm:h-[5.5rem]"
        preserveAspectRatio="xMidYMid meet"
      >
        <motion.circle
          cx={200}
          cy={7}
          r={4}
          fill={DOT}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Left: stem → curve out → horizontal shelf → corner → vertical → ▼ */}
        <motion.path
          d="M 200 13 L 200 19 C 200 19 200 27 150 27 L 108 27 C 98 27 98 35 98 43 L 98 62"
          {...draw}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.path
          d="M 92 66 L 98 73 L 104 66"
          {...draw}
          strokeDasharray="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.5 }}
        />

        {/* Right: mirror */}
        <motion.path
          d="M 200 13 L 200 19 C 200 19 200 27 250 27 L 292 27 C 302 27 302 35 302 43 L 302 62"
          {...draw}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.path
          d="M 296 66 L 302 73 L 308 66"
          {...draw}
          strokeDasharray="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.5 }}
        />
      </svg>
    </div>
  );
}
