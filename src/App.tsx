import AppRoutes from "./routes";
import { Toaster } from "react-hot-toast";
import { env } from "./env";
import { getAppRuntimeMode } from "./appRuntime";

function App() {
  const runtime =
    import.meta.env.DEV && env.showRuntimeDevBadge ? getAppRuntimeMode() : null;

  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 max-w-[100vw] flex-1 flex-col">
      {runtime ? (
        <div
          className="pointer-events-none fixed left-2 right-2 top-2 z-[9999] mx-auto w-fit max-w-[calc(100vw-1rem)] rounded border border-[#30363d] bg-[#0d1117]/95 px-2 py-0.5 text-center font-mono text-[10px] text-[#8b949e] sm:left-auto sm:right-2 sm:mx-0"
          title="Set VITE_APP_RUNTIME and VITE_SHOW_RUNTIME_DEV_BADGE in .env (see .env.example)"
        >
          runtime: {runtime}
        </div>
      ) : null}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0d1117",
            color: "#fff",
            border: "1px solid #30363d",
          },
        }}
      />
      <AppRoutes />
    </div>
  );
}

export default App;
