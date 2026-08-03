import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Terminal } from "lucide-react";

type Part = {
  text: string;
  color?: string;
};

type Line = {
  text: string;
  color?: string;
  parts?: Part[];
  indent?: number;
};

/** Shared line height for gutter numbers and code so rows stay aligned. */
const LINE_CLASS = "h-[1.5em] leading-[1.75]";

const scriptLines: Line[] = [
  { text: "#!/bin/bash", color: "text-gray-400" },
  { text: "" },
  { text: "set -e", color: "text-purple-400" },
  { text: "" },
  { text: 'DIR="$HOME/.tursor"', color: "text-yellow-300" },
  { text: "" },
  { text: "" },
  { text: "# Clone or update repo", color: "text-gray-500" },
  { text: 'if [ -d "$DIR" ]; then', color: "text-purple-400" },
  {
    text: 'cd "$DIR" && git pull',
    indent: 2,
    parts: [
      { text: "cd", color: "text-orange-400" },
      { text: ' "$DIR" && ', color: "text-white" },
      { text: "git", color: "text-green-400" },
      { text: " pull", color: "text-white" },
    ],
  },
  { text: "else", color: "text-purple-400" },
  {
    text: 'git clone https://github.com/QAgent-Labs/Tursor-Backend.git "$DIR"',
    indent: 2,
    parts: [
      { text: "git", color: "text-green-400" },
      { text: " clone ", color: "text-white" },
      {
        text: "https://github.com/QAgent-Labs/Tursor-Backend.git",
        color: "text-blue-400",
      },
      { text: ' "$DIR"', color: "text-yellow-300" },
    ],
  },
  {
    text: 'cd "$DIR"',
    indent: 2,
    parts: [
      { text: "cd", color: "text-orange-400" },
      { text: ' "$DIR"', color: "text-yellow-300" },
    ],
  },
  { text: "fi", color: "text-purple-400" },
  { text: "" },
  { text: "" },
  { text: "# Install dependencies", color: "text-gray-500" },
  {
    text: "npm install",
    parts: [
      { text: "npm", color: "text-orange-400" },
      { text: " install", color: "text-white" },
    ],
  },
  { text: "" },
  { text: "# Build project", color: "text-gray-500" },
  {
    text: "npm run build",
    parts: [
      { text: "npm", color: "text-orange-400" },
      { text: " run ", color: "text-white" },
      { text: "build", color: "text-green-400" },
    ],
  },
  { text: "" },
  { text: "# Register CLI globally", color: "text-gray-500" },
  {
    text: "npm install -g .",
    parts: [
      { text: "npm", color: "text-orange-400" },
      { text: " install -g ", color: "text-white" },
      { text: ".", color: "text-yellow-300" },
    ],
  },
  { text: "" },
  { text: "" },
  { text: "# Start Tursor", color: "text-gray-500" },
  {
    text: "tursor start",
    parts: [
      { text: "tursor", color: "text-green-400" },
      { text: " start", color: "text-white" },
    ],
  },
];

export default function ScriptAnimatedViewer() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setVisibleLines(i);
      i++;
      if (i > scriptLines.length) clearInterval(interval);
    }, 80);

    return () => clearInterval(interval);
  }, []);

  const renderLine = (line: Line, index: number) => {
    const indentSpaces = line.indent ? " ".repeat(line.indent) : "";

    if (line.text === "" && !line.parts) {
      return (
        <div
          key={index}
          className={`${LINE_CLASS} whitespace-pre-wrap break-words`}
        >
          {"\u00A0"}
        </div>
      );
    }

    if (!line.parts) {
      return (
        <div
          key={index}
          className={`${LINE_CLASS} whitespace-pre-wrap break-words ${line.color || "text-slate-200"}`}
        >
          {indentSpaces + line.text}
        </div>
      );
    }

    return (
      <div
        key={index}
        className={`${LINE_CLASS} whitespace-pre-wrap break-words`}
      >
        {indentSpaces}
        {line.parts.map((part, i) => (
          <span key={i} className={part.color}>
            {part.text}
          </span>
        ))}
      </div>
    );
  };

  const lineNumWidth = String(scriptLines.length).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full max-h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-[#0a0e17] shadow-2xl"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-700/50 px-4 py-3">
        <Terminal className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <span className="rounded-md border border-slate-600/50 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200">
          Installation Script
        </span>
        <span className="text-xs text-slate-500">install.sh</span>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto scrollbar-hidden">
        <div className="flex font-mono text-[13px]">
          <div
            className="shrink-0 select-none border-r border-slate-800/80 bg-[#080b12] px-3 py-4 text-right text-slate-600"
            aria-hidden
          >
            {scriptLines.map((_, index) => (
              <div
                key={index}
                className={`${LINE_CLASS} ${index < visibleLines ? "opacity-100" : "opacity-0"}`}
                style={{ minWidth: `${lineNumWidth + 0.5}ch` }}
              >
                {index + 1}
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1 px-4 py-4">
            {scriptLines.slice(0, visibleLines).map(renderLine)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
