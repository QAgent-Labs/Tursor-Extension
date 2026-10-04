export type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "bold" | "italic" | "underline"; children: InlineNode[] };

export type ListItem = {
  text: InlineNode[];
  children: InlineNode[][];
};

export type MarkupBlock =
  | { kind: "paragraph"; lines: InlineNode[][] }
  | { kind: "list"; items: ListItem[] };

function indexOfLoneStar(source: string, start: number): number {
  for (let i = start; i < source.length; i += 1) {
    if (source[i] !== "*") continue;
    if (source[i - 1] === "*" || source[i + 1] === "*") continue;
    return i;
  }
  return -1;
}

export function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buffer = "";
  let index = 0;

  const flush = () => {
    if (!buffer) return;
    nodes.push({ kind: "text", text: buffer });
    buffer = "";
  };

  while (index < source.length) {
    if (source.startsWith("##", index)) {
      const end = source.indexOf("##", index + 2);
      if (end > index + 2) {
        flush();
        nodes.push({
          kind: "bold",
          children: parseInline(source.slice(index + 2, end)),
        });
        index = end + 2;
        continue;
      }
    }

    if (source.startsWith("**", index)) {
      const end = source.indexOf("**", index + 2);
      if (end > index + 2) {
        flush();
        nodes.push({
          kind: "italic",
          children: parseInline(source.slice(index + 2, end)),
        });
        index = end + 2;
        continue;
      }
    }

    if (source[index] === "*" && source[index + 1] !== "*") {
      const end = indexOfLoneStar(source, index + 1);
      if (end !== -1) {
        flush();
        nodes.push({
          kind: "underline",
          children: parseInline(source.slice(index + 1, end)),
        });
        index = end + 1;
        continue;
      }
    }

    buffer += source[index];
    index += 1;
  }

  flush();
  return nodes;
}

export function parseAiMarkup(source: string): MarkupBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkupBlock[] = [];
  let paragraph: InlineNode[][] = [];
  let list: Extract<MarkupBlock, { kind: "list" }> | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", lines: paragraph });
    paragraph = [];
  };

  const flushList = () => {
    if (!list || list.items.length === 0) {
      list = null;
      return;
    }
    blocks.push(list);
    list = null;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("-- ")) {
      flushParagraph();
      list ??= { kind: "list", items: [] };
      const text = parseInline(trimmed.slice(3));
      const parent = list.items[list.items.length - 1];
      if (parent) {
        parent.children.push(text);
      } else {
        list.items.push({ text: [], children: [text] });
      }
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list ??= { kind: "list", items: [] };
      list.items.push({ text: parseInline(trimmed.slice(2)), children: [] });
      continue;
    }

    flushList();
    paragraph.push(parseInline(trimmed));
  }

  flushParagraph();
  flushList();
  return blocks;
}
