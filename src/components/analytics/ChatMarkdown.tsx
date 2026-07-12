import type { ReactNode } from 'react';

/**
 * A small, dependency-free markdown renderer for the Insights chat. Handles the
 * subset the assistant actually emits — paragraphs, **bold**, *italic*,
 * `code`, [links](url), and bullet / numbered lists — with on-brand styling.
 * Unclosed markers (mid-stream) simply render as literal text until they close.
 */

const INLINE =
  /(\*\*(.+?)\*\*)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(`([^`]+)`)|(\*(.+?)\*)/g;

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      out.push(
        <strong key={key++} className="font-semibold text-white">
          {m[2]}
        </strong>
      );
    } else if (m[4] !== undefined) {
      out.push(
        <a
          key={key++}
          href={m[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#B4FF39] underline underline-offset-2 hover:text-[#a2e833]"
        >
          {m[4]}
        </a>
      );
    } else if (m[7] !== undefined) {
      out.push(
        <code
          key={key++}
          className="rounded bg-black/40 px-1 py-0.5 text-[12px] text-white/90"
        >
          {m[7]}
        </code>
      );
    } else if (m[9] !== undefined) {
      out.push(
        <em key={key++} className="italic text-white/80">
          {m[9]}
        </em>
      );
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isBullet = (l: string) => /^\s*[-*]\s+/.test(l);
const isNumbered = (l: string) => /^\s*\d+\.\s+/.test(l);

export const ChatMarkdown = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    if (isBullet(line)) {
      const items: string[] = [];
      while (i < lines.length && isBullet(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc space-y-1 pl-4 marker:text-white/30">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (isNumbered(line)) {
      const items: string[] = [];
      while (i < lines.length && isNumbered(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol
          key={key++}
          className="list-decimal space-y-1 pl-5 marker:text-white/40"
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph: consecutive non-blank, non-list lines.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isBullet(lines[i]) &&
      !isNumbered(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {para.map((l, idx) => (
          <span key={idx}>
            {renderInline(l)}
            {idx < para.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }

  return <div className="space-y-2">{blocks}</div>;
};
