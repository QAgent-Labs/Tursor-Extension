import { AnimatedBackground } from "../components/AnimatedBackground";
import { motion } from "motion/react";
import { Bot, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      <AnimatedBackground />
      <div className="relative z-10 text-center px-8 max-w-4xl">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex items-center justify-center mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 blur-2xl opacity-50 rounded-full" />
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
              <Bot className="w-16 h-16 text-cyan-400" />
              <Sparkles className="absolute -top-3 -right-3 w-6 h-6 text-purple-400" />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent pb-5"
        >
          Tursor
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-xl text-slate-400 mb-4"
        >
          AI-Powered QA Agent for Code Editors
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-slate-500 mb-12 max-w-2xl mx-auto"
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
          className="relative group px-12 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-lg shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300"
        >
          <span className="relative z-10">Get Started</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
        </motion.button>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-16 flex flex-wrap gap-4 justify-center"
        >
          {[
            "Autonomous Testing",
            "Visual Regression",
            "Real-time Insights",
          ].map((feature) => (
            <div
              key={feature}
              className="px-6 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm text-slate-300 text-sm"
            >
              {feature}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
