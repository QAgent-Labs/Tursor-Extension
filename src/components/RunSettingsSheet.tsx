import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTursorAppConfig } from "../context/useTursorAppConfig";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import { TursorConfigFields } from "./TursorConfigFields";
import { configFieldsToPatch } from "../utils/tursorConfigPatch";
import { useTursorConfigDraft } from "../hooks/useTursorConfigDraft";
import {
  backendConnectionStatusClass,
  backendConnectionStatusLabel,
  frontendUrlFromPort,
} from "../utils/connectionStatusLabel";

type Props = {
  open: boolean;
  onClose: () => void;
};

function SettingsFormBody({
  onClose,
}: {
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const {
    config,
    setConfig,
    editorWorkspacePath,
    resolvedWorkspacePath,
  } = useTursorAppConfig();
  const { status, disconnect } = useTursorWebSocket();

  const {
    workspacePath,
    backendPort,
    frontendPort,
    setWorkspacePath,
    setBackendPort,
    setFrontendPort,
    resetDraft,
  } = useTursorConfigDraft(resolvedWorkspacePath, config);

  const connectionLabel = backendConnectionStatusLabel(status);
  const connectionClass = backendConnectionStatusClass(status);
  const frontendUrl =
    frontendUrlFromPort(
      Number.parseInt(frontendPort, 10) > 0
        ? Number.parseInt(frontendPort, 10)
        : config.frontendPort,
    ) ?? null;

  const save = () => {
    setConfig(
      configFieldsToPatch(
        workspacePath,
        editorWorkspacePath,
        backendPort,
        frontendPort,
      ),
    );
    resetDraft();
    disconnect();
    onClose();
    navigate("/connect");
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Backend status
          </p>
          <p className={`mt-1 text-sm font-medium ${connectionClass}`}>
            {connectionLabel}
          </p>
        </div>

        <TursorConfigFields
          workspacePath={workspacePath}
          backendPort={backendPort}
          frontendPort={frontendPort}
          showFrontendPort
          onWorkspacePathChange={setWorkspacePath}
          onBackendPortChange={setBackendPort}
          onFrontendPortChange={setFrontendPort}
          frontendUrl={frontendUrl}
        />
      </div>

      <div className="shrink-0 border-t border-slate-800/80 p-4">
        <button
          type="button"
          onClick={save}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
        >
          Save & reconnect
        </button>
      </div>
    </>
  );
}

export function RunSettingsSheet({ open, onClose }: Props) {
  const { resolvedWorkspacePath, config } = useTursorAppConfig();
  const formKey = `${resolvedWorkspacePath ?? ""}:${config.backendPort ?? ""}:${config.frontendPort ?? ""}`;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close settings"
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="run-settings-title"
            className="fixed bottom-5 right-5 z-50 flex max-h-[min(60dvh,32rem)] w-[30vw] min-w-[17.5rem] max-w-md flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800/80 px-4 py-3">
              <h2
                id="run-settings-title"
                className="text-lg font-semibold text-white"
              >
                Settings
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SettingsFormBody key={formKey} onClose={onClose} />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
