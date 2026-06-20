import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { Wifi, Server, Laptop } from "lucide-react";
import { useTursorWebSocket } from "../context/useTursorWebSocket";

const MIN_CONNECTING_ANIM_MS = 2000;

export function ConnectingScreen() {
  const navigate = useNavigate();
  const { status, connect, lastError } = useTursorWebSocket();
  /** After mount, keep “connecting” visuals for at least this long even if the socket connects sooner. */
  const [minHoldElapsed, setMinHoldElapsed] = useState(false);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    const t = window.setTimeout(
      () => setMinHoldElapsed(true),
      MIN_CONNECTING_ANIM_MS,
    );
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status !== "connected" || !minHoldElapsed) return;
    const t = window.setTimeout(() => navigate("/run"), 450);
    return () => clearTimeout(t);
  }, [status, minHoldElapsed, navigate]);

  const waitingForSocket =
    status === "idle" ||
    status === "connecting" ||
    status === "disconnected" ||
    (status === "connected" && !minHoldElapsed);

  const failed = status === "error";

  return (
    <div className="relative flex min-h-[100dvh] w-full max-w-[100vw] items-center justify-center overflow-x-hidden overflow-y-auto bg-slate-950">
      <AnimatedBackground />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 text-center sm:px-8">
        <div className="mb-10 flex flex-col items-center justify-center gap-10 sm:mb-12 md:flex-row md:gap-8 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-cyan-500/30 blur-2xl" />
              <div className="relative rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-2xl sm:p-6">
                <Laptop className="h-10 w-10 text-cyan-400 sm:h-12 sm:w-12" />
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-400 sm:mt-4 sm:text-sm">
              Frontend
            </p>
          </motion.div>

          <div className="relative mx-auto flex h-16 w-full max-w-xs items-center justify-center sm:h-20 sm:w-40 md:mx-0">
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2">
              <div className="relative h-full w-full overflow-hidden rounded-full">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: 1,
                    opacity: waitingForSocket ? [0.35, 1, 0.35] : 1,
                  }}
                  transition={{
                    scaleX: { delay: 0.2, duration: 0.75, ease: "easeOut" },
                    opacity: waitingForSocket
                      ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.2 },
                  }}
                  className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                />
                {waitingForSocket ? (
                  <motion.div
                    aria-hidden
                    className="absolute inset-y-0 w-1/3 rounded-full bg-white/35 blur-[1px]"
                    animate={{ left: ["-35%", "100%"] }}
                    transition={{
                      duration: 1.25,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                ) : null}
              </div>
            </div>

            <motion.div
              className="relative z-10"
              animate={
                waitingForSocket
                  ? { scale: [1, 1.08, 1] }
                  : failed
                    ? { scale: 1 }
                    : { scale: [1, 1.06, 1] }
              }
              transition={
                waitingForSocket
                  ? {
                      scale: {
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }
                  : failed
                    ? { duration: 0.3 }
                    : {
                        scale: {
                          duration: 0.45,
                          repeat: 2,
                          ease: "easeInOut",
                        },
                      }
              }
            >
              <div
                className={
                  failed
                    ? "p-3 rounded-xl bg-red-500/20 border border-red-500/50 backdrop-blur-sm"
                    : "p-3 rounded-xl bg-blue-500/20 border border-blue-500/50 backdrop-blur-sm"
                }
              >
                <Wifi
                  className={
                    failed
                      ? "w-6 h-6 text-red-400"
                      : waitingForSocket
                        ? "w-6 h-6 text-blue-400"
                        : "w-6 h-6 text-emerald-400"
                  }
                  style={
                    waitingForSocket
                      ? {
                          animation:
                            "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                        }
                      : undefined
                  }
                />
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-2xl" />
              <div className="relative rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-2xl sm:p-6">
                <Server className="h-10 w-10 text-purple-400 sm:h-12 sm:w-12" />
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-400 sm:mt-4 sm:text-sm">
              Backend
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
            {failed ? "Connection failed" : "Establishing Connection"}
          </h2>
          <p className="mx-auto max-w-lg text-sm text-slate-400 sm:text-base">
            {failed
              ? (lastError ??
                "Could not reach the Tursor backend over WebSocket.")
              : waitingForSocket
                ? "Connecting to QAgent backend…"
                : "Connected."}
          </p>
        </motion.div>

        {failed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8"
          >
            <button
              type="button"
              onClick={() => connect()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
            >
              Retry connection
            </button>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: waitingForSocket ? 1 : 0.5 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-2 mt-8"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-blue-400"
                  animate={
                    waitingForSocket
                      ? {
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 1, 0.5],
                        }
                      : {}
                  }
                  transition={
                    waitingForSocket
                      ? {
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }
                      : { duration: 0.3 }
                  }
                />
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-10 max-w-md mx-auto h-1 rounded-full bg-slate-800 overflow-hidden"
            >
              {waitingForSocket ? (
                <motion.div
                  className="h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              ) : (
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                />
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
