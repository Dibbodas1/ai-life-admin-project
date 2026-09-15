"use client";

import React from "react";

interface FormattedChatMessageProps {
  content: string;
}

export default function FormattedChatMessage({ content }: FormattedChatMessageProps) {
  if (!content) return null;

  // Split into lines
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let currentList: React.ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} style={{ margin: "6px 0 10px 0", paddingLeft: 0, listStyle: "none" }}>
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  const renderInline = (text: string): React.ReactNode[] => {
    // Regex for bold (**text**), inline code (`code`), italic (*text* or _text_)
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Check for bold **...**
      const boldMatch = remaining.match(/^([\s\S]*?)\*\*([\s\S]+?)\*\*([\s\S]*)/);
      // Check for inline code `...`
      const codeMatch = remaining.match(/^([\s\S]*?)`([^`]+)`([\s\S]*)/);
      // Check for italic *(not **)...*
      const italicMatch = remaining.match(/^([\s\S]*?)\*([^*]+?)\*([\s\S]*)/);

      // Find which comes first
      const matches = [
        boldMatch ? { type: "bold", index: boldMatch[1].length, match: boldMatch } : null,
        codeMatch ? { type: "code", index: codeMatch[1].length, match: codeMatch } : null,
        italicMatch ? { type: "italic", index: italicMatch[1].length, match: italicMatch } : null,
      ].filter(Boolean).sort((a: any, b: any) => a.index - b.index);

      if (matches.length > 0 && matches[0]) {
        const first = matches[0];
        const prefix = (first.match as any)[1];
        if (prefix) {
          parts.push(prefix);
        }

        if (first.type === "bold") {
          parts.push(
            <strong key={`b-${keyIdx++}`} style={{ color: "var(--text-primary, #F8FAFC)", fontWeight: 650 }}>
              {(first.match as any)[2]}
            </strong>
          );
          remaining = (first.match as any)[3];
        } else if (first.type === "code") {
          parts.push(
            <code key={`c-${keyIdx++}`} style={{
              background: "rgba(255,255,255,0.08)",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: "0.9em",
              fontFamily: "monospace",
              color: "var(--accent-cyan, #06B6D4)"
            }}>
              {(first.match as any)[2]}
            </code>
          );
          remaining = (first.match as any)[3];
        } else if (first.type === "italic") {
          parts.push(
            <em key={`i-${keyIdx++}`} style={{ color: "var(--text-secondary, #94A3B8)", fontStyle: "italic" }}>
              {(first.match as any)[2]}
            </em>
          );
          remaining = (first.match as any)[3];
        }
      } else {
        parts.push(remaining);
        break;
      }
    }

    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Horizontal divider
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushList();
      elements.push(
        <div key={`hr-${i}`} style={{
          height: 1,
          background: "linear-gradient(90deg, rgba(255,255,255,0.02), var(--border-subtle, rgba(255,255,255,0.1)), rgba(255,255,255,0.02))",
          margin: "12px 0"
        }} />
      );
      continue;
    }

    // 2. Headings (###, ##, #)
    if (trimmed.startsWith("#")) {
      flushList();
      const level = trimmed.match(/^#+/)?.[0].length || 1;
      let title = trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();

      // Check if it's a section tag like FACTS, OBSERVATIONS, RECOMMENDATIONS
      let badgeColor = "var(--accent-emerald, #10B981)";
      let badgeBg = "var(--accent-emerald-glow, rgba(16,185,129,0.15))";
      if (title.toLowerCase().includes("fact")) {
        badgeColor = "var(--accent-blue, #3B82F6)";
        badgeBg = "rgba(59,130,246,0.15)";
      } else if (title.toLowerCase().includes("observation") || title.toLowerCase().includes("snapshot")) {
        badgeColor = "var(--accent-amber, #F59E0B)";
        badgeBg = "rgba(245,158,11,0.15)";
      } else if (title.toLowerCase().includes("recommend") || title.toLowerCase().includes("advice")) {
        badgeColor = "var(--accent-violet, #8B5CF6)";
        badgeBg = "rgba(139,92,246,0.15)";
      }

      elements.push(
        <div key={`h-${i}`} style={{
          marginTop: i === 0 ? 0 : 12,
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{
            fontSize: level <= 2 ? 14 : 13,
            fontWeight: 700,
            color: "var(--text-primary, #F8FAFC)",
            letterSpacing: "-0.01em",
            display: "inline-flex",
            alignItems: "center",
            gap: 6
          }}>
            <span style={{
              display: "inline-block",
              width: 4,
              height: 14,
              borderRadius: 2,
              background: badgeColor,
            }} />
            {title}
          </span>
        </div>
      );
      continue;
    }

    // 3. Bullet points (*, -, •)
    const bulletMatch = rawLine.match(/^(\s*)([-*•]|\d+\.)\s+(.*)/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const content = bulletMatch[3];
      currentList.push(
        <li key={`li-${i}`} style={{
          marginLeft: indent > 0 ? 18 : 6,
          marginBottom: 4,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          lineHeight: 1.55,
        }}>
          <span style={{
            color: "var(--accent-emerald, #10B981)",
            fontSize: "12px",
            lineHeight: "22px",
            userSelect: "none"
          }}>
            •
          </span>
          <div style={{ flex: 1 }}>
            {renderInline(content)}
          </div>
        </li>
      );
      continue;
    }

    // Not a list item, flush pending list
    flushList();

    // 4. Empty line
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} style={{ height: 6 }} />);
      continue;
    }

    // 5. Normal text paragraph
    elements.push(
      <p key={`p-${i}`} style={{ margin: "3px 0", lineHeight: 1.65 }}>
        {renderInline(rawLine)}
      </p>
    );
  }

  flushList();

  return <div style={{ wordBreak: "break-word" }}>{elements}</div>;
}
