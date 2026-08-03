import { AnimatedBackground } from "../components/AnimatedBackground";
import { WelcomeFeatures } from "../components/home/WelcomeFeatures";
import { TursorLogo } from "../components/TursorLogo";
import { tursorPrimaryButtonClassName } from "../components/tursorButtonClasses";
import { motion } from "motion/react";
import { Rocket } from "lucide-react";
import { useNavigate } from "react-router";

const PAGE_EASE = [0.16, 1, 0.3, 1] as const;

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-hidden overflow-y-auto bg-[#070B14] font-[Inter,system-ui,sans-serif] tracking-[-0.02em]">
      <AnimatedBackground />

      <motion.main
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: PAGE_EASE }}
        className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8 sm:py-16"
      >
        {/* Logo row */}
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8 flex items-center justify-center gap-2 sm:mb-10"
        >
          <TursorLogo className="h-24 w-24 object-contain" />
          <span className="text-4xl font-bold text-white sm:text-5xl">
            Tursor
          </span>
        </motion.div>

        {/* AI badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: PAGE_EASE }}
          className="mb-6 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5"
        >
          <span className="text-xs font-medium text-violet-300">
            AI-Powered QA Agent
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.55, ease: PAGE_EASE }}
          className="max-w-4xl text-center text-2xl font-extrabold leading-snug sm:text-3xl lg:text-4xl"
        >
          <span className="block text-white">Ship UI changes</span>
          <span className="mt-1 block bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            with confidence
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.55, ease: PAGE_EASE }}
          className="mt-6 max-w-[700px] text-center text-base leading-relaxed text-gray-400 sm:text-lg md:text-[22px] md:leading-[34px]"
        >
          Tursor understands your codebase, executes end-to-end UI tests in real
          browsers, and catches regressions before they reach your users.
        </motion.p>

        {/* Feature blocks */}
        <div className="mt-8 flex w-full justify-center sm:mt-8">
          <WelcomeFeatures />
        </div>

        {/* Primary CTA */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.55, ease: PAGE_EASE }}
          whileHover={{
            scale: 1.01,
            boxShadow: "0 20px 60px rgba(99,102,241,0.36)",
          }}
          whileTap={{ scale: 0.995 }}
          onClick={() => navigate("/initial-setup")}
          className={`group relative mt-12 w-full max-w-xs sm:mt-14 sm:max-w-sm ${tursorPrimaryButtonClassName}`}
        >
          <Rocket className="h-6 w-6 sm:h-6 sm:w-6" aria-hidden />
          Get Started
        </motion.button>
      </motion.main>
    </div>
  );
}
