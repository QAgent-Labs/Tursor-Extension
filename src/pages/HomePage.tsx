import { AnimatedBackground } from "../components/AnimatedBackground";
import { TursorLogo } from "../components/TursorLogo";
import { tursorWordmarkTextGradientClassName } from "../components/tursorWordmarkClasses";
import { motion } from "motion/react";
import { useNavigate } from "react-router";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-[100dvh] w-full max-w-[100vw] items-center justify-center overflow-x-hidden bg-slate-950">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-4xl px-4 py-10 text-center sm:px-8 sm:py-12">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex items-center justify-center mb-8"
        >
          <div className="relative inline-block">
            <TursorLogo className="mx-auto h-16 w-16 object-contain sm:h-20 sm:w-20 md:h-24 md:w-24" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className={`mx-auto text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl mb-4 pb-2 sm:mb-6 sm:pb-5 ${tursorWordmarkTextGradientClassName}`}
        >
          Tursor
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mb-3 text-lg text-slate-400 sm:mb-4 sm:text-xl"
        >
          AI-Powered QA Agent for Code Editors
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mx-auto mb-8 max-w-2xl text-sm text-slate-500 sm:mb-12 sm:text-base"
        >
          Autonomous testing intelligence integrated directly into your
          development workflow. Catch bugs before they ship with next-generation
          automation.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
          onClick={() => navigate("/setup")}
          className="relative group mx-auto w-full max-w-xs rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3.5 text-base font-semibold text-white shadow-2xl shadow-blue-500/30 transition-all duration-300 hover:shadow-blue-500/50 sm:max-w-none sm:px-12 sm:py-4 sm:text-lg"
        >
          <span className="relative z-10 max-w-[50%]">Get Started</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
        </motion.button>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-10 flex flex-wrap justify-center gap-3 sm:mt-16 sm:gap-4"
        >
          {[
            "Autonomous Testing",
            "Visual Regression",
            "Real-time Insights",
          ].map((feature) => (
            <div
              key={feature}
              className="rounded-full border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-xs text-slate-300 backdrop-blur-sm sm:px-6 sm:text-sm"
            >
              {feature}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
