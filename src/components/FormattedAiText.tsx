import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  text: string;
  className?: string;
};

/**
 * Replies saved before Markdown rendering used ##bold## and "-- " sub-bullets.
 * A "## Heading" with a space and no closing pair is real Markdown and is left alone.
 */
function fromLegacyMarkers(text: string): string {
  return text
    .replace(/##([^#\n]+?)##/g, '**$1**')
    .replace(/^-- /gm, '  - ');
}

const components: Components = {
  h1: ({ children }) => (
    <h3 className="mt-1 text-base font-semibold text-white">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-1 text-base font-semibold text-white">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-1 text-[0.95rem] font-semibold text-white">{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className="text-sm font-semibold text-slate-100">{children}</h5>
  ),
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-slate-400">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="flex list-decimal flex-col gap-1 pl-5 marker:text-slate-400">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-50">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-cyan-500/50 pl-3 text-slate-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-slate-700/80" />,
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-lg border border-slate-700/70">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-800/70 text-slate-200">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-slate-700/70 px-2.5 py-1.5 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-slate-800/70 px-2.5 py-1.5 align-top">
      {children}
    </td>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg border border-slate-700/70 bg-slate-950/80 p-3 text-xs leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    // Fenced blocks carry a language class. A "language-mermaid" block is where a
    // diagram renderer can be added later; until then it shows as code.
    if (className?.startsWith('language-')) {
      return <code className={`font-mono ${className}`}>{children}</code>;
    }
    return (
      <code className="rounded bg-slate-800/80 px-1 py-0.5 font-mono text-[0.85em] text-cyan-200">
        {children}
      </code>
    );
  },
};

/** Chat and summary text from Tursor, rendered as Markdown. Raw HTML is never rendered. */
export function FormattedAiText({ text, className }: Props) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-2 break-words ${className ?? ''}`.trim()}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {fromLegacyMarkers(text)}
      </ReactMarkdown>
    </div>
  );
}
