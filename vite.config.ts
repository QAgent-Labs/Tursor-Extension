import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const forExtension = mode === "extension";
  const loadedEnv = loadEnv(mode, __dirname, "");
  if (!loadedEnv.VITE_WORKSPACE_PATH?.trim()) {
    process.env.VITE_WORKSPACE_PATH = __dirname;
  }

  const assertInstallScriptForWebview: import("vite").Plugin = {
    name: "assert-install-script-emits-status",
    buildStart() {
      if (!forExtension) return;
      const installSh = path.join(
        __dirname,
        "extension",
        "scripts",
        "install-tursor.sh",
      );
      const text = fs.readFileSync(installSh, "utf8");
      if (!text.includes("__TURSOR_STATUS__")) {
        throw new Error(
          `${installSh} must emit __TURSOR_STATUS__ lines for the setup webview; restore extension/scripts/install-tursor.sh`,
        );
      }
    },
  };

  return {
    base: forExtension ? "./" : "/",
    plugins: [
      react(),
      tailwindcss(),
      babel({ presets: [reactCompilerPreset()] }),
      assertInstallScriptForWebview,
    ],
    build: forExtension
      ? {
          outDir: "extension/media/webview",
          emptyOutDir: true,
        }
      : undefined,
  };
});
