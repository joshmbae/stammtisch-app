/**
 * Lightweight Markdown renderer for Sepp-Chat.
 * Supports: **bold**, *italic*, # headers, - bullet lists, 1. numbered lists, blank-line paragraphs.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/design";

// ─── Inline-Parser: **bold**, *italic* ────────────────────────────────────────

type InlineSegment = { text: string; bold: boolean; italic: boolean };

function parseInline(raw: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Regex: **bold** | *italic*
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) {
      segments.push({ text: raw.slice(last, match.index), bold: false, italic: false });
    }
    if (match[0].startsWith("**")) {
      segments.push({ text: match[2], bold: true, italic: false });
    } else {
      segments.push({ text: match[3], bold: false, italic: true });
    }
    last = match.index + match[0].length;
  }
  if (last < raw.length) {
    segments.push({ text: raw.slice(last), bold: false, italic: false });
  }
  return segments;
}

function InlineText({ raw, style }: { raw: string; style?: object }) {
  const segments = parseInline(raw);
  return (
    <Text style={style}>
      {segments.map((seg, i) => (
        <Text
          key={i}
          style={[
            seg.bold && styles.bold,
            seg.italic && styles.italic,
          ]}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}

// ─── Block-Parser ─────────────────────────────────────────────────────────────

type Block =
  | { type: "h1" | "h2" | "h3"; content: string }
  | { type: "bullet"; content: string }
  | { type: "numbered"; n: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "hr" };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip blank lines
    if (!trimmed) { i++; continue; }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings
    const h3 = trimmed.match(/^###\s+(.*)/);
    const h2 = trimmed.match(/^##\s+(.*)/);
    const h1 = trimmed.match(/^#\s+(.*)/);
    if (h3) { blocks.push({ type: "h3", content: h3[1] }); i++; continue; }
    if (h2) { blocks.push({ type: "h2", content: h2[1] }); i++; continue; }
    if (h1) { blocks.push({ type: "h1", content: h1[1] }); i++; continue; }

    // Bullet list
    const bullet = trimmed.match(/^[-•*]\s+(.*)/);
    if (bullet) { blocks.push({ type: "bullet", content: bullet[1] }); i++; continue; }

    // Numbered list
    const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numbered) { blocks.push({ type: "numbered", n: parseInt(numbered[1], 10), content: numbered[2] }); i++; continue; }

    // Paragraph — collect consecutive non-special lines
    let para = trimmed;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().match(/^(#{1,3}\s|[-•*]\s|\d+[.)]\s|---+)/)
    ) {
      para += " " + lines[i].trim();
      i++;
    }
    blocks.push({ type: "paragraph", content: para });
  }

  return blocks;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  children: string;
  /** "sepp" = dark text in light bubble, "user" = white text in blue bubble */
  variant?: "sepp" | "user";
}

export default function MarkdownText({ children, variant = "sepp" }: Props) {
  // User messages are plain — no markdown parsing needed
  if (variant === "user") {
    return <Text style={styles.userText}>{children}</Text>;
  }

  const blocks = parseBlocks(children);

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        const isLast = idx === blocks.length - 1;
        const mb = isLast ? 0 : 4;

        switch (block.type) {
          case "h1":
            return (
              <InlineText key={idx} raw={block.content}
                style={[styles.h1, { marginBottom: mb + 2 }]} />
            );
          case "h2":
            return (
              <InlineText key={idx} raw={block.content}
                style={[styles.h2, { marginBottom: mb + 2 }]} />
            );
          case "h3":
            return (
              <InlineText key={idx} raw={block.content}
                style={[styles.h3, { marginBottom: mb }]} />
            );
          case "bullet":
            return (
              <View key={idx} style={[styles.listRow, { marginBottom: mb }]}>
                <Text style={styles.bullet}>•</Text>
                <InlineText raw={block.content} style={styles.seppText} />
              </View>
            );
          case "numbered":
            return (
              <View key={idx} style={[styles.listRow, { marginBottom: mb }]}>
                <Text style={styles.bullet}>{block.n}.</Text>
                <InlineText raw={block.content} style={styles.seppText} />
              </View>
            );
          case "hr":
            return <View key={idx} style={[styles.hr, { marginBottom: mb }]} />;
          default:
            return (
              <InlineText key={idx} raw={block.content}
                style={[styles.seppText, { marginBottom: mb }]} />
            );
        }
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flexShrink: 1 },

  seppText: { fontSize: 15, lineHeight: 22, color: COLORS.textDark },
  userText: { fontSize: 15, lineHeight: 22, color: "#FFFFFF" },

  bold:   { fontWeight: "700" },
  italic: { fontStyle: "italic" },

  h1: { fontSize: 18, fontWeight: "800", color: COLORS.textDark, lineHeight: 24 },
  h2: { fontSize: 16, fontWeight: "800", color: COLORS.textDark, lineHeight: 22 },
  h3: { fontSize: 14, fontWeight: "700", color: COLORS.blue,     lineHeight: 20 },

  listRow:  { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  bullet:   { fontSize: 15, lineHeight: 22, color: COLORS.gold, fontWeight: "700", minWidth: 18 },

  hr: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
});
