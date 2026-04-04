import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const forExtension = mode === "extension";

  return {
    base: forExtension ? "./" : "/",
    plugins: [
      react(),
      tailwindcss(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    build: forExtension
      ? {
          outDir: "extension/media/webview",
          emptyOutDir: true,
        }
      : undefined,
  };
});
