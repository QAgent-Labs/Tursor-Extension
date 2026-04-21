import { AnimatedBackground } from "../components/AnimatedBackground";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import { motion } from "motion/react";
import { Bot } from "lucide-react";

/**
 * Placeholder for the main Tursor session; uses the global WebSocket from setup.
 */
export default function RunPage() {
  const { status } = useTursorWebSocket();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center px-8 max-w-xl"
      >
        <Bot className="w-14 h-14 text-cyan-400 mx-auto mb-6" />
        <h1 className="text-3xl font-semibold text-white mb-2">Tursor</h1>
        <p className="text-slate-400 mb-6">
          Backend link:{" "}
          <span className="text-emerald-400 font-medium">{status}</span>
        </p>
        <p className="text-slate-500 text-sm">
          Use <code className="text-slate-300">useTursorWebSocket()</code>{" "}
          here to send and subscribe to messages over the shared connection.
        </p>
      </motion.div>
    </div>
  );
}
