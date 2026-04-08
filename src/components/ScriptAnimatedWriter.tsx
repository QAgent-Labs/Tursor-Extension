import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Part = {
  text: string;
  color?: string;
};

type Line = {
  text: string;
  color?: string;
  parts?: Part[];
  indent?: number; // 👈 NEW
};

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
    }, 80); // line-by-line speed (cleaner than char-based)

    return () => clearInterval(interval);
  }, []);

  const renderLine = (line: Line, index: number) => {
    const indentSpaces = line.indent ? " ".repeat(line.indent) : "";

    if (line.text === "" && !line.parts) {
      return (
        <div key={index} className="h-[1.2em] whitespace-pre-wrap break-words">
          {"\u00A0"} {/* non-breaking space */}
        </div>
      );
    }

    if (!line.parts) {
      return (
        <div
          key={index}
          className={`whitespace-pre-wrap break-words leading-normal ${line.color || ""}`}
        >
          {indentSpaces + line.text}
        </div>
      );
    }

    return (
      <div key={index} className="whitespace-pre-wrap break-words">
        {indentSpaces}
        {line.parts.map((part, i) => (
          <span key={i} className={part.color}>
            {part.text}
          </span>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full min-h-0 min-w-0 flex-col text-sm rounded-xl font-mono shadow-lg border border-gray-800 "
    >
      <div className="min-h-0 min-w-0 flex-1 bg-[#0d1117] p-4 overflow-x-auto scrollbar-hidden">
        {scriptLines.slice(0, visibleLines).map(renderLine)}
      </div>
    </motion.div>
  );
}
