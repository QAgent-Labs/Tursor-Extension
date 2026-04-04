import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { AnimatedBackground } from "../components/AnimatedBackground";
import TursorHeader from "../components/TursorHeader";

export default function ErrorPage() {
  return (
    <div className="h-full w-[100%] flex flex-col items-space-between justify-space-between">
      <AnimatedBackground />
      <div className="h-screen flex flex-col z-10 ">
        <TursorHeader />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Error
          </p>
          <h2 className="mb-4 text-8xl font-bold tabular-nums leading-none sm:text-9xl">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              404
            </span>
          </h2>
          <h3 className="mb-3 text-2xl font-semibold text-slate-100 sm:text-3xl">
            Page not found
          </h3>
          <p className="mb-10 max-w-md text-slate-400">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40"
          >
            <Home className="h-5 w-5" aria-hidden />
            Back to home
          </Link>
        </main>
      </div>
    </div>
  );
}
