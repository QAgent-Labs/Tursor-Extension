import { motion } from "motion/react";
import { AnimatedBackground } from "../components/AnimatedBackground";
import ScriptAnimatedViewer from "../components/ScriptAnimatedWriter";
import TursorHeader from "../components/TursorHeader";
import { Zap } from "lucide-react";

export default function SetupPage() {
  return (
    <div className="w-[100%] flex flex-col items-space-between justify-space-between">
      <AnimatedBackground />
      <div className="h-screen flex flex-col z-10 ">
        <TursorHeader />
        <div className="flex min-h-0 min-w-0 flex-1 flex-row z-10 gap-10">
          <div className="flex h-full min-h-0 min-w-0 w-[42%] flex-col overflow-hidden py-10 px-5">
            <ScriptAnimatedViewer />
          </div>
          <div className="flex h-full min-h-0 min-w-0 w-[58%] flex-col py-10 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-8 p-8 w-[75%] rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    One-Click Setup
                  </h2>
                  <p className="text-slate-400">
                    Automatically install and start the Tursor backend
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Install & Start Tursor
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
