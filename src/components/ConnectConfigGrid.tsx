import { FolderOpen } from "lucide-react";
import { useWorkspaceFolderPicker } from "../hooks/useWorkspaceFolderPicker";
import { DisabledReasonTooltip } from "./DisabledReasonTooltip";
import {
  tursorPrimaryButtonClassName,
  tursorPrimaryButtonHalfWrapperClassName,
  tursorSecondaryButtonFullWidthClassName,
} from "./tursorButtonClasses";

const fieldClassName =
  "w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2.5 font-mono text-xs text-slate-200";

type Props = {
  workspacePath: string | null;
  backendPort: string;
  frontendPort: string;
  onWorkspacePathChange: (path: string) => void;
  onBackendPortChange: (value: string) => void;
  onFrontendPortChange: (value: string) => void;
  onApplyReconnect: () => void;
  frontendPortError: string | null;
  checkingFrontend: boolean;
  canContinue: boolean;
  continueDisabledReason: string | null;
  onContinue: () => void;
};

export function ConnectConfigGrid({
  workspacePath,
  backendPort,
  frontendPort,
  onWorkspacePathChange,
  onBackendPortChange,
  onFrontendPortChange,
  onApplyReconnect,
  frontendPortError,
  checkingFrontend,
  canContinue,
  continueDisabledReason,
  onContinue,
}: Props) {
  const pickFolder = useWorkspaceFolderPicker(onWorkspacePathChange);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Workspace
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={workspacePath ?? ""}
            onChange={(e) => onWorkspacePathChange(e.target.value)}
            placeholder="Path to your project workspace"
            className={fieldClassName}
          />
          <button
            type="button"
            onClick={pickFolder}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800/80"
            aria-label="Choose workspace folder"
          >
            <FolderOpen className="h-4 w-4 text-cyan-500/90" />
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Backend port
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={backendPort}
          onChange={(e) => onBackendPortChange(e.target.value)}
          placeholder="9090"
          className={fieldClassName}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Test frontend port
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={frontendPort}
          onChange={(e) => onFrontendPortChange(e.target.value)}
          placeholder="5173"
          className={fieldClassName}
        />
        {frontendPortError ? (
          <p className="mt-1.5 text-[11px] text-red-400">{frontendPortError}</p>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={onApplyReconnect}
          className={tursorSecondaryButtonFullWidthClassName}
        >
          Apply settings & reconnect
        </button>
      </div>

      <div className="flex justify-center sm:col-span-2">
        <DisabledReasonTooltip
          disabled={!canContinue}
          reason={continueDisabledReason}
          className={tursorPrimaryButtonHalfWrapperClassName}
        >
          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className={`w-full ${tursorPrimaryButtonClassName}`}
          >
            {checkingFrontend ? "Checking frontend port…" : "Run tests →"}
          </button>
        </DisabledReasonTooltip>
      </div>
    </div>
  );
}
