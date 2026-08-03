import type { ReactNode } from "react";

/** Matches ~/.tursor, .tursor, and common path suffixes like /config.json */
const TURSOR_PATH_PATTERN =
  /(~\/\.tursor(?:\/[\w.-]+)*|\.tursor(?:\/[\w.-]+)*)/g;

type Props = {
  text: string;
  className?: string;
};

export function TursorPathText({ text, className }: Props) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(TURSOR_PATH_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    nodes.push(
      <span key={`tursor-path-${matchIndex}`} className="font-mono text-cyan-400">
        {match[0]}
      </span>,
    );
    matchIndex += 1;
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  if (nodes.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className}>{nodes}</span>;
}
