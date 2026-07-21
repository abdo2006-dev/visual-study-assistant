"use client";

import katex from "katex";
import { useMemo } from "react";

/**
 * Renders LaTeX via KaTeX. AI-supplied equation strings are data, never
 * trusted markup: `trust: false` (KaTeX's default) disables commands that
 * could embed arbitrary HTML/URLs, and a render failure (malformed LaTeX)
 * falls back to the raw source instead of throwing.
 */
export function Equation({
  latex,
  display = false,
  className,
}: {
  latex: string;
  display?: boolean;
  className?: string;
}) {
  const result = useMemo(() => {
    try {
      const html = katex.renderToString(latex, {
        throwOnError: true,
        displayMode: display,
        output: "htmlAndMathml",
        trust: false,
        strict: "warn",
      });
      return { html, error: null };
    } catch (err) {
      return {
        html: null,
        error: err instanceof Error ? err.message : "Invalid equation",
      };
    }
  }, [latex, display]);

  if (result.error) {
    return (
      <span
        className={`rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-xs text-destructive ${className ?? ""}`}
        title={`Could not render this equation: ${result.error}`}
      >
        {latex}
      </span>
    );
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: result.html! }} />;
}
