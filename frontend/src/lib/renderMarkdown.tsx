import React from "react";
import { cleanLatexAndSymbols } from "./textSanitizer";

export const parseInlineStyles = (text: string): React.ReactNode => {
  let parts: (string | React.ReactNode)[] = [text];

  // Parse Bold **text**
  let tempParts: (string | React.ReactNode)[] = [];
  let boldIndex = 0;
  for (const part of parts) {
    if (typeof part === "string") {
      const split = part.split(/\*\*([^*]+)\*\*/g);
      for (let i = 0; i < split.length; i++) {
        if (i % 2 === 1) {
          tempParts.push(
            <strong key={`b-${boldIndex++}`} className="font-bold text-primary">
              {split[i]}
            </strong>
          );
        } else if (split[i]) {
          tempParts.push(split[i]);
        }
      }
    } else {
      tempParts.push(part);
    }
  }
  parts = tempParts;

  // Parse Italic *text*
  tempParts = [];
  let italicIndex = 0;
  for (const part of parts) {
    if (typeof part === "string") {
      const split = part.split(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g);
      for (let i = 0; i < split.length; i++) {
        if (i % 2 === 1) {
          tempParts.push(
            <em key={`i-${italicIndex++}`} className="italic text-muted">
              {split[i]}
            </em>
          );
        } else if (split[i]) {
          tempParts.push(split[i]);
        }
      }
    } else {
      tempParts.push(part);
    }
  }
  parts = tempParts;

  // Parse Inline Code `code`
  tempParts = [];
  let codeIndex = 0;
  for (const part of parts) {
    if (typeof part === "string") {
      const split = part.split(/`([^`]+)`/g);
      for (let i = 0; i < split.length; i++) {
        if (i % 2 === 1) {
          tempParts.push(
            <code
              key={`c-${codeIndex++}`}
              className="bg-dark px-1.5 py-0.5 rounded text-xs font-mono border border-muted/20 text-accent"
            >
              {split[i]}
            </code>
          );
        } else if (split[i]) {
          tempParts.push(split[i]);
        }
      }
    } else {
      tempParts.push(part);
    }
  }
  parts = tempParts;

  return <>{parts}</>;
};

/**
 * Full markdown-like renderer used by BOTH the Tutor tab and the Lessons tab.
 * Supports:
 *  - Headings  # ## ### (h1–h6)
 *  - Unordered lists  - item  or  * item
 *  - Ordered lists    1. item  2. item …
 *  - Code fences      ```code```
 *  - Horizontal rules  ---
 *  - Empty lines (spacing)
 *  - Inline: **bold**, *italic*, `code`
 */
export const renderMessageContent = (text: string): React.ReactNode[] => {
  const sanitizedText = cleanLatexAndSymbols(text);
  const lines = sanitizedText.split("\n");
  const elements: React.ReactNode[] = [];

  let orderedBuffer: string[] = [];
  let unorderedBuffer: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeBlockKey = 0;
  // Persistent ordered-list counter — never resets inside a run of ordered items
  let orderedStartNumber = 1;

  const flushOrdered = () => {
    if (orderedBuffer.length === 0) return;
    const startAt = orderedStartNumber - orderedBuffer.length;
    elements.push(
      <ol key={`ol-${elements.length}`} className="ml-1 my-2 space-y-1" style={{ listStyle: "none", padding: 0 }}>
        {orderedBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-2 leading-relaxed text-text">
            <span className="text-primary font-semibold flex-shrink-0 min-w-[1.25rem]">{startAt + i}.</span>
            <span className="flex-1">{parseInlineStyles(item)}</span>
          </li>
        ))}
      </ol>
    );
    orderedBuffer = [];
  };

  const flushUnordered = () => {
    if (unorderedBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="my-2 space-y-1">
        {unorderedBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-2 pl-1">
            <span className="text-primary mt-1.5 select-none text-xs flex-shrink-0">•</span>
            <span className="flex-1 leading-relaxed text-text">{parseInlineStyles(item)}</span>
          </li>
        ))}
      </ul>
    );
    unorderedBuffer = [];
  };

  const flushBoth = () => {
    flushOrdered();
    flushUnordered();
  };

  // Reset ordered counter when a non-ordered-list block is flushed
  const flushBothAndResetCounter = () => {
    flushBoth();
    orderedStartNumber = 1;
  };

  lines.forEach((line, index) => {
    // ── Code block fence ────────────────────────────────────────────────────
    if (line.trim().startsWith("```")) {
      if (!inCodeBlock) {
        flushBothAndResetCounter();
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <pre
            key={`code-${codeBlockKey++}`}
            className="bg-dark/60 border border-muted/20 rounded-xl p-4 my-3 overflow-x-auto text-xs font-mono text-accent leading-relaxed"
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    // ── Horizontal rule ─────────────────────────────────────────────────────
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushBothAndResetCounter();
      elements.push(<hr key={`hr-${index}`} className="border-muted/20 my-4" />);
      return;
    }

    // ── Headings ────────────────────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushBothAndResetCounter();
      const level = headingMatch[1].length;
      const headingText = parseInlineStyles(headingMatch[2]);
      switch (level) {
        case 1:
          elements.push(
            <h1 key={index} className="text-xl font-extrabold text-primary mt-5 mb-2 border-b border-primary/20 pb-1">
              {headingText}
            </h1>
          );
          break;
        case 2:
          elements.push(
            <h2 key={index} className="text-lg font-bold text-primary mt-4 mb-2">
              {headingText}
            </h2>
          );
          break;
        case 3:
          elements.push(
            <h3 key={index} className="text-base font-semibold text-text mt-3 mb-1">
              {headingText}
            </h3>
          );
          break;
        default:
          elements.push(
            <h4 key={index} className="text-sm font-semibold text-muted mt-2 mb-1">
              {headingText}
            </h4>
          );
      }
      return;
    }

    // ── Ordered list  1. …  2. … ────────────────────────────────────────────
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      flushUnordered();
      // If this is the start of a new ordered list (buffer was empty), sync counter
      if (orderedBuffer.length === 0) {
        orderedStartNumber = parseInt(orderedMatch[1], 10);
      }
      orderedBuffer.push(orderedMatch[2]);
      orderedStartNumber++;
      return;
    }

    // ── Unordered list  - …  or  * … ────────────────────────────────────────
    const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushOrdered();
      orderedStartNumber = 1; // Reset counter when unordered list starts
      unorderedBuffer.push(unorderedMatch[1]);
      return;
    }

    // ── Empty line (spacing) ─────────────────────────────────────────────────
    if (line.trim() === "") {
      // Flush unordered immediately, but keep ordered buffer alive across blank
      // lines so that Gemini's style of blank-line-separated numbered items
      // doesn't restart the counter each time.
      if (unorderedBuffer.length > 0) {
        flushUnordered();
      }
      // Only flush ordered if the next non-blank line is NOT another ordered item
      // We do that lazily: just add a tiny spacer without flushing the ordered buffer
      if (orderedBuffer.length === 0) {
        elements.push(<div key={`sp-${index}`} className="h-2" />);
      }
      return;
    }

    // ── Normal paragraph ─────────────────────────────────────────────────────
    flushBothAndResetCounter();
    elements.push(
      <p key={index} className="leading-relaxed my-1.5 text-text">
        {parseInlineStyles(line)}
      </p>
    );
  });

  // Flush any trailing list items
  flushBoth();

  return elements;
};
