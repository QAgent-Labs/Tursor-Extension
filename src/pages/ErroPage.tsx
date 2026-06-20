import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { AnimatedBackground } from "../components/AnimatedBackground";
import TursorHeader from "../components/TursorHeader";

export default function ErrorPage() {
  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col">
      <AnimatedBackground />
      <div className="z-10 flex min-h-[100dvh] flex-1 flex-col">
        <TursorHeader showHomeButton={false} />
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-4 text-center sm:px-6 sm:pb-16">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 sm:text-sm">
            Error
          </p>
          <h2 className="mb-4 text-6xl font-bold tabular-nums leading-none sm:text-8xl sm:leading-none lg:text-9xl">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              404
            </span>
          </h2>
          <h3 className="mb-3 text-xl font-semibold text-slate-100 sm:text-2xl lg:text-3xl">
            Page not found
          </h3>
          <p className="mb-8 max-w-md text-sm text-slate-400 sm:mb-10 sm:text-base">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 sm:px-8 sm:py-3.5 sm:text-base"
          >
            <Home className="h-5 w-5" aria-hidden />
            Back to home
          </Link>
        </main>
      </div>
    </div>
  );
}
