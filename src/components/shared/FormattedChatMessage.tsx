"use client";

import React, { useState } from "react";
import { Copy, Check, CheckCircle2 } from "lucide-react";

interface FormattedChatMessageProps {
  content: string;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      margin: "10px 0",
      borderRadius: "12px",
      background: "rgba(11, 15, 28, 0.9)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      overflow: "hidden",
      fontSize: "13px",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 14px",
        background: "rgba(255, 255, 255, 0.04)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        color: "#94A3B8",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }}>
        <span>{language || "code"}</span>
        <button
          onClick={handleCopy}
          style={{
            background: "none",
            border: "none",
            color: copied ? "#34D399" : "#94A3B8",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: "11px",
            padding: "2px 6px",
            borderRadius: "4px",
          }}
          title="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: "12px 14px",
        overflowX: "auto",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineHeight: 1.5,
        color: "#E2E8F0",
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function FormattedChatMessage({ content }: FormattedChatMessageProps) {
  if (!content) return null;

  const elements: React.ReactNode[] = [];
  const lines = content.split("\n");

  let currentList: React.ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} style={{ margin: "8px 0 12px 0", paddingLeft: 0, listStyle: "none" }}>
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  // Helper to highlight monetary tokens
  const highlightCurrencies = (text: string): React.ReactNode[] => {
    // Matches $1,234.56, ৳15,000, ৳ 500, 5000 tk, 2500 tk, BDT 500
    const currencyRegex = /(\$\s?\d+(?:,\d{3})*(?:\.\d{1,2})?|৳\s?\d+(?:,\d{3})*(?:\.\d{1,2})?|\b\d+(?:,\d{3})*(?:\.\d{1,2})?\s?(?:tk|taka|bdt)\b)/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = currencyRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <span
          key={`curr-${match.index}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "1px 6px",
            margin: "0 2px",
            borderRadius: "6px",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.28)",
            color: "#34D399",
            fontWeight: 700,
            fontSize: "0.95em",
            letterSpacing: "0.01em",
          }}
        >
          {match[0]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : [text];
  };

  const renderInline = (text: string): React.ReactNode[] => {
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

      const matches = [
        boldMatch ? { type: "bold", index: boldMatch[1].length, match: boldMatch } : null,
        codeMatch ? { type: "code", index: codeMatch[1].length, match: codeMatch } : null,
        italicMatch ? { type: "italic", index: italicMatch[1].length, match: italicMatch } : null,
      ].filter(Boolean).sort((a: any, b: any) => a.index - b.index);

      if (matches.length > 0 && matches[0]) {
        const first = matches[0];
        const prefix = (first.match as any)[1];
        if (prefix) {
          parts.push(...highlightCurrencies(prefix));
        }

        if (first.type === "bold") {
          parts.push(
            <strong key={`b-${keyIdx++}`} style={{ color: "var(--text-primary, #F8FAFC)", fontWeight: 700 }}>
              {(first.match as any)[2]}
            </strong>
          );
          remaining = (first.match as any)[3];
        } else if (first.type === "code") {
          parts.push(
            <code key={`c-${keyIdx++}`} style={{
              background: "rgba(255,255,255,0.08)",
              padding: "2px 6px",
              borderRadius: 5,
              fontSize: "0.88em",
              fontFamily: "monospace",
              color: "var(--accent-cyan, #06B6D4)",
              border: "1px solid rgba(6, 182, 212, 0.2)"
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
        parts.push(...highlightCurrencies(remaining));
        break;
      }
    }

    return parts;
  };

  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code blocks
    if (trimmed.startsWith("```")) {
      flushList();
      if (inCodeBlock) {
        elements.push(
          <CodeBlock
            key={`code-${i}`}
            code={codeBlockLines.join("\n")}
            language={codeBlockLang}
          />
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = "";
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.replace("```", "").trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Horizontal divider
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushList();
      elements.push(
        <div key={`hr-${i}`} style={{
          height: 1,
          background: "linear-gradient(90deg, rgba(255,255,255,0.02), var(--border-subtle, rgba(255,255,255,0.1)), rgba(255,255,255,0.02))",
          margin: "14px 0"
        }} />
      );
      continue;
    }

    // Success / Mutation callouts
    const isMutationSuccess =
      trimmed.toLowerCase().includes("successfully added") ||
      trimmed.toLowerCase().includes("successfully updated") ||
      trimmed.toLowerCase().includes("successfully recorded") ||
      trimmed.toLowerCase().includes("successfully cleared") ||
      trimmed.toLowerCase().includes("successfully transferred") ||
      trimmed.startsWith("[SUCCESS]") ||
      trimmed.startsWith("[MUTATION]");

    if (isMutationSuccess) {
      flushList();
      elements.push(
        <div key={`success-${i}`} style={{
          margin: "8px 0",
          padding: "10px 14px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.25) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#E2E8F0",
          fontSize: "13.5px",
          boxShadow: "0 4px 14px rgba(16, 185, 129, 0.15)",
        }}>
          <CheckCircle2 size={18} style={{ color: "#34D399", flexShrink: 0 }} />
          <div>{renderInline(trimmed.replace(/^\[(SUCCESS|MUTATION)\]\s*/i, ""))}</div>
        </div>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      flushList();
      const quoteText = trimmed.replace(/^>\s*/, "");
      elements.push(
        <div key={`quote-${i}`} style={{
          margin: "8px 0",
          padding: "8px 14px",
          borderLeft: "3px solid #818CF8",
          background: "rgba(99, 102, 241, 0.06)",
          borderRadius: "0 10px 10px 0",
          color: "#C7D2FE",
          fontSize: "13.5px",
          fontStyle: "italic",
        }}>
          {renderInline(quoteText)}
        </div>
      );
      continue;
    }

    // Headings (###, ##, #)
    if (trimmed.startsWith("#")) {
      flushList();
      const level = trimmed.match(/^#+/)?.[0].length || 1;
      const title = trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();

      let badgeColor = "var(--accent-emerald, #10B981)";
      if (title.toLowerCase().includes("fact") || title.toLowerCase().includes("data")) {
        badgeColor = "var(--accent-blue, #3B82F6)";
      } else if (title.toLowerCase().includes("observation") || title.toLowerCase().includes("snapshot") || title.toLowerCase().includes("warning")) {
        badgeColor = "var(--accent-amber, #F59E0B)";
      } else if (title.toLowerCase().includes("recommend") || title.toLowerCase().includes("advice") || title.toLowerCase().includes("action")) {
        badgeColor = "var(--accent-violet, #8B5CF6)";
      } else if (title.toLowerCase().includes("copilot") || title.toLowerCase().includes("assistant") || title.toLowerCase().includes("summary")) {
        badgeColor = "#6366F1";
      }

      elements.push(
        <div key={`h-${i}`} style={{
          marginTop: i === 0 ? 0 : 14,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{
            fontSize: level <= 2 ? 15 : 13.5,
            fontWeight: 800,
            color: "var(--text-primary, #F8FAFC)",
            letterSpacing: "-0.01em",
            display: "inline-flex",
            alignItems: "center",
            gap: 8
          }}>
            <span style={{
              display: "inline-block",
              width: 4,
              height: 15,
              borderRadius: 2,
              background: badgeColor,
            }} />
            {title}
          </span>
        </div>
      );
      continue;
    }

    // Bullet points (*, -, •, \d+.)
    const bulletMatch = rawLine.match(/^(\s*)([-*•]|\d+\.)\s+(.*)/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const content = bulletMatch[3];
      const bulletMarker = bulletMatch[2];
      const isNumbered = /^\d+\./.test(bulletMarker);

      currentList.push(
        <li key={`li-${i}`} style={{
          marginLeft: indent > 0 ? 20 : 6,
          marginBottom: 6,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          lineHeight: 1.55,
        }}>
          {isNumbered ? (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "rgba(99, 102, 241, 0.18)",
              color: "#A5B4FC",
              fontSize: "11px",
              fontWeight: 700,
              flexShrink: 0,
              marginTop: 2,
            }}>
              {bulletMarker.replace(".", "")}
            </span>
          ) : (
            <span style={{
              color: "#818CF8",
              fontSize: "14px",
              lineHeight: "22px",
              userSelect: "none"
            }}>
              •
            </span>
          )}
          <div style={{ flex: 1, color: "inherit" }}>
            {renderInline(content)}
          </div>
        </li>
      );
      continue;
    }

    flushList();

    // Empty line
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} style={{ height: 6 }} />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${i}`} style={{ margin: "4px 0", lineHeight: 1.65 }}>
        {renderInline(rawLine)}
      </p>
    );
  }

  flushList();

  return <div style={{ wordBreak: "break-word" }}>{elements}</div>;
}
