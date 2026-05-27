/**
 * HTML → @react-pdf/renderer renderer.
 *
 * Converts the HTML output of the rich-text editor into a tree of react-pdf
 * primitives so that the formatted cover-letter body can be embedded in a
 * vector PDF with formatting (bold, italic, underline, lists, headings, links)
 * preserved — rather than stripped to plain text.
 *
 * Supported HTML elements:
 *   Block : p  h1  h2  h3  ul  ol  li  blockquote  br  div
 *   Inline: strong  b  em  i  u  s  del  a  code  br  text-nodes
 *
 * Anything unrecognised is rendered as its plain-text content.
 *
 * NOTE: This file is CLIENT-SIDE ONLY.  DOMParser is a browser API and PDF
 * generation always happens in the browser / Tauri context, so that is safe.
 */

import { Link, Text, View } from "@react-pdf/renderer";
import React from "react";

import { ResolvedPDFStyles } from "./resolveStyles";

// ─── Shared base body style ──────────────────────────────────────────────────

type RteStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  lineHeight: number;
};

// ─── Inline rendering ────────────────────────────────────────────────────────

function renderInlineNodes(
  nodes: NodeListOf<ChildNode>,
  s: ResolvedPDFStyles,
  keyPrefix: string
): React.ReactElement[] {
  const out: React.ReactElement[] = [];
  nodes.forEach((node, i) => {
    const el = renderInlineNode(node, s, `${keyPrefix}-${i}`);
    if (el) out.push(el);
  });
  return out;
}

function renderInlineNode(
  node: ChildNode,
  s: ResolvedPDFStyles,
  key: string
): React.ReactElement | null {
  // Plain text node
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text) return null;
    return <Text key={key}>{text}</Text>;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "strong":
    case "b":
      return (
        <Text key={key} style={{ fontWeight: 700 }}>
          {renderInlineNodes(el.childNodes, s, key)}
        </Text>
      );

    case "em":
    case "i":
      return (
        <Text key={key} style={{ fontStyle: "italic" }}>
          {renderInlineNodes(el.childNodes, s, key)}
        </Text>
      );

    case "u":
      return (
        <Text key={key} style={{ textDecoration: "underline" }}>
          {renderInlineNodes(el.childNodes, s, key)}
        </Text>
      );

    case "s":
    case "del":
      return (
        <Text key={key} style={{ textDecoration: "line-through" }}>
          {renderInlineNodes(el.childNodes, s, key)}
        </Text>
      );

    case "a": {
      const href = el.getAttribute("href") ?? "#";
      return (
        <Link key={key} src={href} style={{ color: s.accentColor }}>
          {el.textContent ?? ""}
        </Link>
      );
    }

    case "code":
      return (
        <Text
          key={key}
          style={{ fontFamily: "Courier", fontSize: s.fontSize - 1 }}
        >
          {el.textContent ?? ""}
        </Text>
      );

    case "br":
      return <Text key={key}>{"\n"}</Text>;

    default:
      // Unknown inline tag — render plain text content
      return <Text key={key}>{el.textContent ?? ""}</Text>;
  }
}

// ─── Block rendering ─────────────────────────────────────────────────────────

/**
 * Parses `html` and returns an array of react-pdf block elements that respect
 * bold/italic/underline, lists, headings, blockquotes and links.
 *
 * @param html         Raw HTML string from the rich-text editor
 * @param s            Resolved PDF style tokens (colors, font sizes, etc.)
 * @param overrides    Optional style overrides applied to paragraph text nodes
 */
export function htmlToPdfNodes(
  html: string,
  s: ResolvedPDFStyles,
  overrides?: Partial<RteStyle>
): React.ReactElement[] {
  if (!html?.trim()) return [];

  const doc = new DOMParser().parseFromString(html, "text/html");
  const results: React.ReactElement[] = [];
  let idx = 0;

  const base: RteStyle = {
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    color: s.textColor,
    lineHeight: s.lineHeight,
    ...overrides,
  };

  function block(node: ChildNode): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() ?? "";
      if (text) {
        results.push(
          <Text key={idx++} style={base}>
            {text}
          </Text>
        );
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const key = idx++;

    switch (tag) {
      case "p": {
        const inlineChildren = renderInlineNodes(el.childNodes, s, `p-${key}`);
        // Empty paragraph → tiny vertical spacer
        if (inlineChildren.length === 0 && !el.textContent?.trim()) {
          results.push(
            <View key={key} style={{ marginBottom: base.fontSize * 0.5 }} />
          );
        } else {
          results.push(
            <Text
              key={key}
              style={{ ...base, marginBottom: base.fontSize * 0.4 }}
            >
              {inlineChildren.length > 0
                ? inlineChildren
                : (el.textContent ?? "")}
            </Text>
          );
        }
        break;
      }

      case "h1":
        results.push(
          <Text
            key={key}
            style={{
              ...base,
              fontSize: s.headingFontSize + 4,
              fontWeight: 700,
              color: s.primaryColor,
              marginTop: base.fontSize,
              marginBottom: base.fontSize * 0.5,
            }}
          >
            {el.textContent ?? ""}
          </Text>
        );
        break;

      case "h2":
        results.push(
          <Text
            key={key}
            style={{
              ...base,
              fontSize: s.headingFontSize + 2,
              fontWeight: 700,
              color: s.primaryColor,
              marginTop: base.fontSize * 0.8,
              marginBottom: base.fontSize * 0.4,
            }}
          >
            {el.textContent ?? ""}
          </Text>
        );
        break;

      case "h3":
        results.push(
          <Text
            key={key}
            style={{
              ...base,
              fontSize: s.headingFontSize,
              fontWeight: 600,
              color: s.primaryColor,
              marginTop: base.fontSize * 0.6,
              marginBottom: base.fontSize * 0.3,
            }}
          >
            {el.textContent ?? ""}
          </Text>
        );
        break;

      case "ul":
      case "ol": {
        const listItems = Array.from(el.querySelectorAll(":scope > li"));
        listItems.forEach((li, liIdx) => {
          const prefix = tag === "ul" ? "•" : `${liIdx + 1}.`;
          const inlineChildren = renderInlineNodes(
            li.childNodes,
            s,
            `li-${key}-${liIdx}`
          );
          results.push(
            <View
              key={`${key}-li-${liIdx}`}
              style={{
                flexDirection: "row",
                marginBottom: base.fontSize * 0.25,
              }}
            >
              <Text style={{ ...base, width: 14, flexShrink: 0 }}>
                {prefix}
              </Text>
              <Text style={{ ...base, flex: 1 }}>
                {inlineChildren.length > 0
                  ? inlineChildren
                  : (li.textContent ?? "")}
              </Text>
            </View>
          );
        });
        break;
      }

      case "blockquote":
        results.push(
          <View
            key={key}
            style={{
              borderLeftWidth: 2,
              borderLeftColor: s.secondaryColor,
              paddingLeft: 8,
              marginTop: base.fontSize * 0.5,
              marginBottom: base.fontSize * 0.5,
            }}
          >
            <Text style={{ ...base, color: s.secondaryColor }}>
              {el.textContent ?? ""}
            </Text>
          </View>
        );
        break;

      case "br":
        results.push(
          <View key={key} style={{ height: base.fontSize * 0.5 }} />
        );
        break;

      // Generic containers — recurse into children
      case "div":
      case "section":
      case "article":
        el.childNodes.forEach(block);
        break;

      default:
        if (el.textContent?.trim()) {
          results.push(
            <Text key={key} style={base}>
              {el.textContent}
            </Text>
          );
        }
    }
  }

  doc.body.childNodes.forEach(block);
  return results;
}
