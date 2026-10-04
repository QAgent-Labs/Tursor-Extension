import type { InlineNode } from "../format/parseAiMarkup";
import { parseAiMarkup } from "../format/parseAiMarkup";

type Props = {
  text: string;
  className?: string;
};

function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.kind === "text") {
          return <span key={index}>{node.text}</span>;
        }
        const className =
          node.kind === "bold"
            ? "font-semibold text-slate-50"
            : node.kind === "italic"
              ? "italic"
              : "underline decoration-slate-300/80 underline-offset-2";
        const Tag = node.kind === "bold" ? "strong" : node.kind === "italic" ? "em" : "u";
        return (
          <Tag key={index} className={className}>
            <Inline nodes={node.children} />
          </Tag>
        );
      })}
    </>
  );
}

export function FormattedAiText({ text, className }: Props) {
  const blocks = parseAiMarkup(text);

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`.trim()}>
      {blocks.map((block, index) => {
        if (block.kind === "paragraph") {
          return (
            <p key={index}>
              {block.lines.map((line, lineIndex) => (
                <span key={lineIndex}>
                  {lineIndex > 0 ? <br /> : null}
                  <Inline nodes={line} />
                </span>
              ))}
            </p>
          );
        }

        return (
          <ul key={index} className="flex list-disc flex-col gap-1 pl-5">
            {block.items.map((item, itemIndex) => (
              <li
                key={itemIndex}
                className={item.text.length === 0 ? "list-none" : undefined}
              >
                {item.text.length > 0 ? <Inline nodes={item.text} /> : null}
                {item.children.length > 0 ? (
                  <ul className="mt-1 flex list-[circle] flex-col gap-1 pl-5">
                    {item.children.map((child, childIndex) => (
                      <li key={childIndex}>
                        <Inline nodes={child} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
