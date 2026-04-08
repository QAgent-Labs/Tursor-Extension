import { motion } from "motion/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { Wifi, Server, Laptop } from "lucide-react";

export function ConnectingScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigate]);
 
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      <AnimatedBackground />

      <div className="relative z-10 text-center px-8">
        {/* Connection Animation */}
        <div className="flex items-center justify-center gap-12 mb-12">
          {/* Frontend Icon */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/30 blur-2xl rounded-full" />
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
                <Laptop className="w-12 h-12 text-cyan-400" />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-400 font-medium">Frontend</p>
          </motion.div>

          {/* Connection Line & Icon */}
          <div className="relative">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="w-32 h-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 origin-left"
            />
            <motion.div
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/50 backdrop-blur-sm">
                <Wifi className="w-6 h-6 text-blue-400 animate-pulse" />
              </div>
            </motion.div>
          </div>

          {/* Backend Icon */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/30 blur-2xl rounded-full" />
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
                <Server className="w-12 h-12 text-purple-400" />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-400 font-medium">Backend</p>
          </motion.div>
        </div>

        {/* Status Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h2 className="text-3xl font-bold text-white mb-3">
            Establishing Connection
          </h2>
          <p className="text-slate-400">Connecting to QAgent backend...</p>
        </motion.div>

        {/* Loading Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="flex items-center justify-center gap-2 mt-8"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-blue-400"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 max-w-md mx-auto"
        >
          <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
