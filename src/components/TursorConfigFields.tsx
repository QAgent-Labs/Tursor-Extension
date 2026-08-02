import { FolderOpen } from "lucide-react";
import { formatWorkspacePathForDisplay } from "../api/tursorContext";
import { useWorkspaceFolderPicker } from "../hooks/useWorkspaceFolderPicker";

export type TursorConfigFieldsProps = {
  workspacePath: string | null;
  backendPort: string;
  frontendPort?: string;
  onWorkspacePathChange: (path: string) => void;
  onBackendPortChange: (value: string) => void;
  onFrontendPortChange?: (value: string) => void;
  showFrontendPort?: boolean;
  backendPortReadOnly?: boolean;
  connectionLabel?: string;
  showConnectionStatus?: boolean;
  frontendUrl?: string | null;
};

export function TursorConfigFields({
  workspacePath,
  backendPort,
  frontendPort = "",
  onWorkspacePathChange,
  onBackendPortChange,
  onFrontendPortChange,
  showFrontendPort = false,
  backendPortReadOnly = false,
  connectionLabel,
  showConnectionStatus = false,
  frontendUrl,
}: TursorConfigFieldsProps) {
  const pickFolder = useWorkspaceFolderPicker(onWorkspacePathChange);

  return (
    <dl className="space-y-4 text-sm">
      <div>
        <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Workspace
        </dt>
        <button
          type="button"
          onClick={pickFolder}
          className="flex w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-left transition-colors hover:border-slate-600 hover:bg-slate-800/80"
        >
          <FolderOpen className="h-4 w-4 shrink-0 text-cyan-500/90" />
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-200">
            {workspacePath
              ? formatWorkspacePathForDisplay(workspacePath)
              : "Loading workspace…"}
          </span>
        </button>
        <p className="mt-1 text-[11px] text-slate-500">
          Defaults to your open editor folder. Tap to choose a different path.
        </p>
      </div>

      <div>
        <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Backend port
        </dt>
        {backendPortReadOnly ? (
          <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 font-mono text-xs text-slate-300">
            {backendPort.trim() || "Detecting…"}
          </p>
        ) : (
          <input
            type="text"
            inputMode="numeric"
            value={backendPort}
            onChange={(e) => onBackendPortChange(e.target.value)}
            placeholder="9090"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200"
          />
        )}
        {backendPortReadOnly ? (
          <p className="mt-1 text-[11px] text-slate-500">
            Resolved from the running Tursor backend (`tursor port`).
          </p>
        ) : null}
      </div>

      {showFrontendPort && onFrontendPortChange ? (
        <div>
          <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Test frontend port
          </dt>
          <input
            type="text"
            inputMode="numeric"
            value={frontendPort}
            onChange={(e) => onFrontendPortChange(e.target.value)}
            placeholder="5173"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Port where your app dev server is running.
          </p>
          {frontendUrl ? (
            <div className="mt-3">
              <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Frontend URL
              </dt>
              <dd className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2 font-mono text-[11px] text-cyan-300/90">
                {frontendUrl}
              </dd>
            </div>
          ) : null}
        </div>
      ) : null}

      {showConnectionStatus && connectionLabel ? (
        <div>
          <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Connection status
          </dt>
          <dd className="text-slate-300">{connectionLabel}</dd>
        </div>
      ) : null}
    </dl>
  );
}
