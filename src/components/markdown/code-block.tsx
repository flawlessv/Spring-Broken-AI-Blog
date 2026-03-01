"use client";

import { useState, useCallback, useMemo } from "react";
import hljs from "highlight.js/lib/core";
import { Copy, Check } from "lucide-react";

// Import only the languages we need to reduce bundle size
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import css from "highlight.js/lib/languages/css";
import scss from "highlight.js/lib/languages/scss";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml"; // for JSX/HTML
import bash from "highlight.js/lib/languages/bash";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import php from "highlight.js/lib/languages/php";
import ruby from "highlight.js/lib/languages/ruby";
import swift from "highlight.js/lib/languages/swift";
import kotlin from "highlight.js/lib/languages/kotlin";

// Register languages
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("jsx", javascript); // Use JavaScript highlighting for JSX
hljs.registerLanguage("tsx", typescript); // Use TypeScript highlighting for TSX
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("java", java);
hljs.registerLanguage("css", css);
hljs.registerLanguage("scss", scss);
hljs.registerLanguage("json", json);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);
hljs.registerLanguage("go", go);
hljs.registerLanguage("golang", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("rs", rust);
hljs.registerLanguage("php", php);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("rb", ruby);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("kt", kotlin);

// VS2015 theme styles (inline)
const hlStyles = `
  .hljs {
    background: transparent;
    color: #DCDCDC;
  }
  .hljs-keyword, .hljs-selector-tag, .hljs-literal {
    color: #569CD6;
    font-weight: 500;
  }
  .hljs-string, .hljs-doctag {
    color: #CE9178;
  }
  .hljs-title, .hljs-section, .hljs-selector-id {
    color: #DCDCAA;
    font-weight: 500;
  }
  .hljs-subst {
    color: #DCDCDC;
  }
  .hljs-type, .hljs-class .hljs-title {
    color: #4EC9B0;
    font-weight: 500;
  }
  .hljs-tag, .hljs-name, .hljs-attribute {
    color: #92C5F8;
  }
  .hljs-regexp, .hljs-link {
    color: #D16969;
  }
  .hljs-symbol, .hljs-bullet {
    color: #DCDCAA;
  }
  .hljs-built_in, .hljs-builtin-name {
    color: #4EC9B0;
    font-weight: 500;
  }
  .hljs-meta {
    color: #D7BA7D;
  }
  .hljs-deletion {
    background: #5A1E1E;
  }
  .hljs-addition {
    background: #1E5A1E;
  }
  .hljs-emphasis {
    font-style: italic;
  }
  .hljs-strong {
    font-weight: bold;
  }
  .hljs-comment, .hljs-quote {
    color: #6A9955;
    font-style: italic;
    opacity: 0.9;
  }
  .hljs-number {
    color: #B5CEA8;
  }
  .hljs-variable, .hljs-template-variable {
    color: #9CDCFE;
  }
  .hljs-attr {
    color: #92C5F8;
  }
  .hljs-function {
    color: #DCDCAA;
    font-weight: 500;
  }
  .hljs-params {
    color: #9CDCFE;
  }
`;

interface CodeBlockProps {
  children: string;
  className?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // Extract language from className (e.g., "language-javascript" -> "javascript")
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "plaintext";
  const code = String(children).replace(/\n$/, "");

  const highlightedHtml = useMemo(() => {
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value;
      }

      return escapeHtml(code);
    } catch (error) {
      console.error("Highlight code failed:", error);
      return escapeHtml(code);
    }
  }, [code, language]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  }, [code]);

  const lineCount = code.split("\n").length;

  return (
    <>
      {/* Inject highlight.js styles */}
      <style dangerouslySetInnerHTML={{ __html: hlStyles }} />

      <div className="relative group my-6">
        {/* Header bar with language and copy button */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 rounded-t-xl border-b border-gray-700">
          {/* Language badge */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-3 text-xs font-medium text-gray-300 uppercase tracking-wide">
              {language}
            </span>
          </div>

          {/* Copy button */}
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-all duration-200"
            title="复制代码"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-400" />
                <span className="text-green-400">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>复制</span>
              </>
            )}
          </button>
        </div>

        {/* Code content */}
        <div className="relative bg-gray-900 rounded-b-xl overflow-hidden">
          {/* Line numbers */}
          {lineCount > 3 && (
            <div className="absolute left-0 top-0 bottom-0 flex flex-col text-xs text-gray-500 bg-gray-800/30 border-r border-gray-700 px-3 py-4 select-none min-w-[3rem] text-right">
              {Array.from({ length: lineCount }, (_, i) => (
                <span key={`line-number-${i}`} className="leading-6 font-mono">
                  {i + 1}
                </span>
              ))}
            </div>
          )}

          {/* Code block */}
          <pre
            className="overflow-x-auto text-sm leading-6 font-mono"
            style={{
              padding: lineCount > 3 ? "1rem 1rem 1rem 4rem" : "1rem",
            }}
          >
            <code
              className={`hljs language-${language} block`}
              style={{
                background: "transparent",
                padding: 0,
                fontSize: "0.875rem",
                lineHeight: "1.6",
                color: "#DCDCDC",
                fontFamily:
                  "'Fira Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
              }}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </pre>
        </div>
      </div>
    </>
  );
}
