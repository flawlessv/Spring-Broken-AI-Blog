/**
 * Markdown 与 Tiptap JSON 格式转换器
 *
 * 功能：在 Markdown（字符串）和 Tiptap JSONContent（对象）之间进行双向转换
 *
 * 使用场景：
 * - 编辑器内部使用 JSONContent 格式（便于操作和渲染）
 * - 存储和传输使用 Markdown 格式（人类可读，体积小）
 *
 * 转换流程：
 * Markdown 字符串 → MarkdownIt 解析 → Token 数组 → Tiptap JSONContent
 * Tiptap JSONContent → 递归遍历节点 → Markdown 字符串
 */

import { JSONContent } from "@tiptap/core";
import MarkdownIt from "markdown-it";

// 初始化 Markdown 解析器
const md = new MarkdownIt({
  html: true, // 允许 HTML 标签
  linkify: true, // 自动识别链接
  typographer: true, // 启用排版优化（如引号转换）
});

/**
 * 辅助函数：检查文本节点是否为空
 */
function isEmptyText(text: string | undefined): boolean {
  return !text || !text.trim();
}

/**
 * 处理行内格式（inline）的 Token 子节点
 *
 * 作用：将 MarkdownIt 解析出的行内 Token（如粗体、斜体、链接等）
 *       转换为 Tiptap 的 JSONContent 格式
 *
 * 支持的格式：
 * - 普通文本（text）
 * - 粗体（**text** → strong_open/strong_close）
 * - 斜体（*text* → em_open/em_close）
 * - 行内代码（`code` → code_inline）
 * - 链接（[text](url) → link_open/link_close）
 *
 * @param children - MarkdownIt 解析出的行内 Token 子节点数组
 * @returns Tiptap JSONContent 格式的内容数组
 *
 * @example
 * 输入：[{type: "text", content: "Hello"}, {type: "strong_open"}, ...]
 * 输出：[{type: "text", text: "Hello"}, {type: "text", text: "World", marks: [{type: "bold"}]}]
 */
function processInlineChildren(children: any[]): any[] {
  if (!children || children.length === 0) return [];

  const result: any[] = [];
  let index = 0;

  while (index < children.length) {
    const token = children[index];

    // 情况 1：普通文本
    if (token.type === "text") {
      if (!isEmptyText(token.content)) {
        result.push({ type: "text", text: token.content });
      }
      index++;
    }
    // 情况 2：粗体（**text**）
    else if (token.type === "strong_open") {
      index++; // 跳过 strong_open
      const text = children[index]?.content || "";
      if (!isEmptyText(text)) {
        result.push({
          type: "text",
          text,
          marks: [{ type: "bold" }],
        });
      }
      index++; // 跳过文本节点
      index++; // 跳过 strong_close
    }
    // 情况 3：斜体（*text*）
    else if (token.type === "em_open") {
      index++; // 跳过 em_open
      const text = children[index]?.content || "";
      if (!isEmptyText(text)) {
        result.push({
          type: "text",
          text,
          marks: [{ type: "italic" }],
        });
      }
      index++; // 跳过文本节点
      index++; // 跳过 em_close
    }
    // 情况 4：行内代码（`code`）
    else if (token.type === "code_inline") {
      if (!isEmptyText(token.content)) {
        result.push({
          type: "text",
          text: token.content,
          marks: [{ type: "code" }],
        });
      }
      index++;
    }
    // 情况 5：链接（[text](url)）
    else if (token.type === "link_open") {
      // 从属性中提取链接地址
      const href =
        token.attrs?.find((attr: any[]) => attr[0] === "href")?.[1] || "";
      index++; // 跳过 link_open
      const text = children[index]?.content || "";
      if (!isEmptyText(text)) {
        result.push({
          type: "text",
          text,
          marks: [{ type: "link", attrs: { href } }],
        });
      }
      index++; // 跳过文本节点
      index++; // 跳过 link_close
    }
    // 其他类型：跳过
    else {
      index++;
    }
  }

  return result;
}

/**
 * 将 Markdown 字符串转换为 Tiptap JSONContent 格式
 *
 * 转换流程：
 * 1. 使用 MarkdownIt 解析 Markdown 字符串，得到 Token 数组
 * 2. 遍历 Token 数组，根据 Token 类型转换为对应的 Tiptap 节点
 * 3. 处理嵌套结构（如列表、引用等）
 * 4. 返回完整的 JSONContent 对象
 *
 * 支持的 Markdown 语法：
 * - 标题（# ## ###）
 * - 段落
 * - 代码块（```）
 * - 列表（有序/无序）
 * - 引用（>）
 * - 分隔线（---）
 * - 行内格式（粗体、斜体、代码、链接）
 *
 * @param markdown - Markdown 格式的字符串
 * @returns Tiptap JSONContent 格式的对象
 *
 * @example
 * ```typescript
 * const json = markdownToJSON("# 标题\n\n这是段落");
 * // 返回: { type: "doc", content: [{ type: "heading", ... }, { type: "paragraph", ... }] }
 * ```
 */
export function markdownToJSON(markdown: string): JSONContent {
  // 空内容处理：返回空文档
  if (!markdown.trim()) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  // 步骤 1：使用 MarkdownIt 解析 Markdown，得到 Token 数组
  const tokens = md.parse(markdown, {});
  const content: any[] = [];
  let tokenIndex = 0;

  // 步骤 2：遍历 Token 数组，逐个转换为 Tiptap 节点
  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];

    // ========== 标题（# ## ###）==========
    if (token.type === "heading_open") {
      // 从标签中提取级别（如 h1 → 1, h2 → 2）
      const level = parseInt(token.tag.slice(1));
      tokenIndex++; // 跳过 heading_open

      // 获取行内内容 Token
      const inlineToken = tokens[tokenIndex];
      // 提取标题文本（简化处理，只提取纯文本）
      const text =
        inlineToken?.type === "inline" && inlineToken.children
          ? inlineToken.children
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.content)
              .join("")
          : inlineToken?.content || "";

      tokenIndex++; // 跳过 inline
      tokenIndex++; // 跳过 heading_close

      // 只有非空标题才添加
      if (!isEmptyText(text)) {
        content.push({
          type: "heading",
          attrs: { level },
          content: [{ type: "text", text: text.trim() }],
        });
      }
    }
    // ========== 代码块（```language\ncode\n```）==========
    else if (token.type === "fence" || token.type === "code_block") {
      const language = token.info || ""; // 代码语言（如 "javascript", "python"）
      content.push({
        type: "codeBlock",
        attrs: { language: language || null },
        content: [{ type: "text", text: token.content }],
      });
      tokenIndex++;
    }
    // ========== 段落 ==========
    else if (token.type === "paragraph_open") {
      tokenIndex++; // 跳过 paragraph_open

      // 获取行内内容 Token
      const inlineToken = tokens[tokenIndex];

      // 检查是否包含图片
      const hasImage = inlineToken?.children?.some(
        (child: any) => child.type === "image"
      );

      if (hasImage && inlineToken?.children) {
        // 如果段落只包含图片，直接提取图片节点
        const imageToken = inlineToken.children.find(
          (child: any) => child.type === "image"
        );
        if (imageToken) {
          const src =
            imageToken.attrs?.find((attr: any[]) => attr[0] === "src")?.[1] ||
            "";
          const alt = imageToken.content || "";
          content.push({
            type: "image",
            attrs: { src, alt },
          });
        }
      } else {
        // 处理行内格式（粗体、斜体、链接等）
        const paragraphContent =
          inlineToken?.type === "inline" && inlineToken.children
            ? processInlineChildren(inlineToken.children)
            : [];

        // 过滤掉空的文本节点
        const filteredContent = paragraphContent.filter((item: any) => {
          if (item.type === "text") {
            return !isEmptyText(item.text);
          }
          return true;
        });

        // 只有非空段落才添加
        if (filteredContent.length > 0) {
          content.push({ type: "paragraph", content: filteredContent });
        }
      }

      tokenIndex++; // 跳过 inline
      tokenIndex++; // 跳过 paragraph_close
    }
    // ========== 列表（有序/无序）==========
    else if (
      token.type === "bullet_list_open" ||
      token.type === "ordered_list_open"
    ) {
      const isOrdered = token.type === "ordered_list_open";
      const listItems: any[] = [];
      tokenIndex++; // 跳过 list_open

      // 遍历列表项，直到遇到 list_close
      const listCloseType = isOrdered
        ? "ordered_list_close"
        : "bullet_list_close";
      while (
        tokenIndex < tokens.length &&
        tokens[tokenIndex].type !== listCloseType
      ) {
        if (tokens[tokenIndex].type === "list_item_open") {
          tokenIndex++; // 跳过 list_item_open
          const itemContent: any[] = [];

          // 遍历列表项内容，直到遇到 list_item_close
          while (
            tokenIndex < tokens.length &&
            tokens[tokenIndex].type !== "list_item_close"
          ) {
            if (tokens[tokenIndex].type === "paragraph_open") {
              tokenIndex++; // 跳过 paragraph_open
              const inlineToken = tokens[tokenIndex];
              if (inlineToken?.type === "inline" && inlineToken.children) {
                const processed = processInlineChildren(inlineToken.children);
                // 过滤空文本节点
                const filtered = processed.filter((item: any) => {
                  return item.type !== "text" || !isEmptyText(item.text);
                });
                itemContent.push(...filtered);
              }
              tokenIndex++; // 跳过 inline
              tokenIndex++; // 跳过 paragraph_close
            } else {
              tokenIndex++;
            }
          }

          // 只有非空列表项才添加
          if (itemContent.length > 0) {
            listItems.push({
              type: "listItem",
              content: [{ type: "paragraph", content: itemContent }],
            });
          }
          tokenIndex++; // 跳过 list_item_close
        } else {
          tokenIndex++;
        }
      }

      // 添加列表节点
      content.push({
        type: isOrdered ? "orderedList" : "bulletList",
        content: listItems,
      });
      tokenIndex++; // 跳过 list_close
    }
    // ========== 引用（> text）==========
    else if (token.type === "blockquote_open") {
      const quoteContent: any[] = [];
      tokenIndex++; // 跳过 blockquote_open

      // 遍历引用内容，直到遇到 blockquote_close
      while (
        tokenIndex < tokens.length &&
        tokens[tokenIndex].type !== "blockquote_close"
      ) {
        if (tokens[tokenIndex].type === "paragraph_open") {
          tokenIndex++; // 跳过 paragraph_open
          const inlineToken = tokens[tokenIndex];
          if (inlineToken?.type === "inline" && inlineToken.children) {
            const processed = processInlineChildren(inlineToken.children);
            // 过滤空文本节点
            const filtered = processed.filter((item: any) => {
              return item.type !== "text" || !isEmptyText(item.text);
            });
            if (filtered.length > 0) {
              quoteContent.push({
                type: "paragraph",
                content: filtered,
              });
            }
          }
          tokenIndex++; // 跳过 inline
          tokenIndex++; // 跳过 paragraph_close
        } else {
          tokenIndex++;
        }
      }

      content.push({ type: "blockquote", content: quoteContent });
      tokenIndex++; // 跳过 blockquote_close
    }
    // ========== 分隔线（---）==========
    else if (token.type === "hr") {
      content.push({ type: "horizontalRule" });
      tokenIndex++;
    }
    // ========== 其他类型：跳过 ==========
    else {
      tokenIndex++;
    }
  }

  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}

/**
 * 将 Tiptap JSONContent 格式转换为 Markdown 字符串
 *
 * 转换流程：
 * 1. 递归遍历 JSONContent 的节点树
 * 2. 根据节点类型生成对应的 Markdown 语法
 * 3. 处理行内格式（粗体、斜体、代码、链接）
 * 4. 合并为完整的 Markdown 字符串
 *
 * 支持的节点类型：
 * - heading（标题）
 * - paragraph（段落）
 * - codeBlock（代码块）
 * - bulletList/orderedList（列表）
 * - blockquote（引用）
 * - horizontalRule（分隔线）
 *
 * @param json - Tiptap JSONContent 格式的对象
 * @returns Markdown 格式的字符串
 *
 * @example
 * ```typescript
 * const markdown = jsonToMarkdown({ type: "doc", content: [...] });
 * // 返回: "# 标题\n\n这是段落"
 * ```
 */
export function jsonToMarkdown(json: JSONContent): string {
  if (!json.content || json.content.length === 0) {
    return "";
  }

  const markdownLines: string[] = [];

  /**
   * 辅助函数：递归提取节点中的纯文本内容
   * 用于获取标题、列表项等节点的文本
   */
  function extractText(node: any): string {
    if (node.type === "text") {
      return node.text || "";
    }
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join("");
    }
    return "";
  }

  /**
   * 将单个节点转换为 Markdown 字符串
   *
   * @param node - Tiptap 节点对象
   * @returns Markdown 字符串
   */
  function nodeToMarkdown(node: any): string {
    // ========== 标题 ==========
    if (node.type === "heading") {
      const level = node.attrs?.level || 1;
      const text = extractText(node);
      return "#".repeat(level) + " " + text;
    }

    // ========== 代码块 ==========
    if (node.type === "codeBlock") {
      const language = node.attrs?.language || "";
      const code = extractText(node);
      return "```" + language + "\n" + code + "\n```";
    }

    // ========== 段落 ==========
    if (node.type === "paragraph") {
      if (!node.content || node.content.length === 0) {
        return "";
      }

      let paragraphText = "";
      for (const child of node.content) {
        if (child.type === "text") {
          let text = child.text || "";

          // 处理行内格式标记（marks）
          if (child.marks && child.marks.length > 0) {
            for (const mark of child.marks) {
              if (mark.type === "bold") {
                text = "**" + text + "**";
              } else if (mark.type === "italic") {
                text = "*" + text + "*";
              } else if (mark.type === "code") {
                text = "`" + text + "`";
              } else if (mark.type === "link") {
                const href = mark.attrs?.href || "";
                text = "[" + text + "](" + href + ")";
              }
            }
          }

          paragraphText += text;
        } else if (child.type === "hardBreak") {
          paragraphText += "\n";
        } else if (child.type === "image") {
          // 处理段落中的图片（Tiptap 可能将图片放在段落内）
          const src = child.attrs?.src || "";
          const alt = child.attrs?.alt || "";
          paragraphText += `![${alt}](${src})`;
        }
      }

      return paragraphText;
    }

    // ========== 无序列表 ==========
    if (node.type === "bulletList") {
      return (
        node.content?.map((item: any) => "- " + extractText(item)).join("\n") ||
        ""
      );
    }

    // ========== 有序列表 ==========
    if (node.type === "orderedList") {
      return (
        node.content
          ?.map((item: any, idx: number) => `${idx + 1}. ${extractText(item)}`)
          .join("\n") || ""
      );
    }

    // ========== 引用 ==========
    if (node.type === "blockquote") {
      const quoteText =
        node.content?.map((child: any) => extractText(child)).join("\n") || "";
      // 每行前添加 "> "
      return quoteText
        .split("\n")
        .map((line: string) => "> " + line)
        .join("\n");
    }

    // ========== 分隔线 ==========
    if (node.type === "horizontalRule") {
      return "---";
    }

    // ========== 图片 ==========
    if (node.type === "image") {
      const src = node.attrs?.src || "";
      const alt = node.attrs?.alt || "";
      return `![${alt}](${src})`;
    }

    // 未知类型：返回空字符串
    return "";
  }

  // 步骤 3：遍历所有节点，转换为 Markdown
  for (const node of json.content) {
    const markdown = nodeToMarkdown(node);
    if (markdown) {
      markdownLines.push(markdown);
    }
  }

  // 步骤 4：用双换行符连接所有行（Markdown 标准格式）
  return markdownLines.join("\n\n");
}
