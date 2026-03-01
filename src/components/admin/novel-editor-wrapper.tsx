/**
 * Novel 编辑器包装组件
 *
 * 功能：将 Novel（Notion 风格的 WYSIWYG 编辑器）与 Markdown 格式进行双向同步
 *
 * 简化设计：
 * - 编辑器内部使用 Tiptap JSONContent 格式
 * - 外部使用 Markdown 格式
 * - 使用简单的标志防止循环更新
 */

"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  EditorRoot,
  EditorContent,
  StarterKit,
  Placeholder,
  TiptapLink,
} from "novel";
import Image from "@tiptap/extension-image";
import { AICompletion } from "@/lib/editor/ai-completion-extension";
import {
  markdownToJSON,
  jsonToMarkdown,
} from "@/lib/editor/markdown-converter";

interface NovelEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  postId?: string;
  postSlug?: string;
  onEditorReady?: (editor: any) => void; // 暴露编辑器实例
}

export default function NovelEditorWrapper({
  value,
  onChange,
  placeholder = "开始写作吧...",
  postId,
  postSlug,
  onEditorReady,
}: NovelEditorWrapperProps) {
  // 防止循环更新的标志
  const isUpdatingRef = useRef(false);
  const editorRef = useRef<any>(null);

  // 图片上传处理函数
  const handleImageUpload = async (file: File) => {
    if (!postId || !postSlug) {
      throw new Error("请先保存文章后再上传图片");
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("postId", postId);
      formData.append("type", "content");

      const response = await fetch("/api/admin/images/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("图片上传失败");
      }

      const data = await response.json();
      return data.image.path; // 返回图片 URL
    } catch (error) {
      console.error("图片上传失败:", error);
      throw error;
    }
  };

  // 初始化内容：将 Markdown 转换为 JSONContent
  const initialContent = useMemo(() => {
    if (!value.trim()) {
      return { type: "doc", content: [{ type: "paragraph" }] };
    }
    try {
      return markdownToJSON(value);
    } catch (error) {
      console.error("初始化内容出错:", error);
      return { type: "doc", content: [{ type: "paragraph" }] };
    }
  }, []);

  // 当外部 value 变化时，更新编辑器
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isUpdatingRef.current) return;

    // 比较内容是否真的变化了
    const currentMarkdown = jsonToMarkdown(editor.getJSON());
    if (currentMarkdown.trim() === value.trim()) return;

    // 更新编辑器内容
    isUpdatingRef.current = true;
    editor.commands.setContent(markdownToJSON(value));
    isUpdatingRef.current = false;
  }, [value]);

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          immediatelyRender={false}
          className="novel-editor min-h-full w-full px-6 py-4 focus:outline-none prose prose-sm max-w-none"
          extensions={[
            StarterKit.configure({}),
            TiptapLink.configure({
              openOnClick: false,
            }),
            Image.configure({
              inline: false, // 改为 false，让图片成为块级元素
              allowBase64: false,
              HTMLAttributes: {
                class: "rounded-lg max-w-xl mx-auto h-auto my-4",
              },
            }),
            Placeholder.configure({
              placeholder: placeholder,
            }),
            AICompletion.configure({
              debounceMs: 500,
              minChars: 3,
              apiEndpoint: "/api/ai/write/complete",
            }),
          ]}
          onCreate={({ editor }) => {
            editorRef.current = editor;
            onEditorReady?.(editor);
          }}
          onUpdate={({ editor }) => {
            // 保存编辑器实例
            editorRef.current = editor;

            // 如果正在从外部更新，不触发 onChange
            if (isUpdatingRef.current) return;

            // 编辑器内容变化，同步到外部
            const markdown = jsonToMarkdown(editor.getJSON());
            onChange(markdown);
          }}
          editorProps={{
            attributes: {
              class:
                "prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px]",
            },
            handleDrop: (view, event, slice, moved) => {
              // 处理图片拖拽上传
              if (
                !moved &&
                event.dataTransfer &&
                event.dataTransfer.files &&
                event.dataTransfer.files[0]
              ) {
                const file = event.dataTransfer.files[0];
                if (file.type.startsWith("image/")) {
                  event.preventDefault();
                  handleImageUpload(file)
                    .then((url) => {
                      const { schema } = view.state;
                      const coordinates = view.posAtCoords({
                        left: event.clientX,
                        top: event.clientY,
                      });
                      if (coordinates) {
                        const node = schema.nodes.image.create({ src: url });
                        const transaction = view.state.tr.insert(
                          coordinates.pos,
                          node
                        );
                        view.dispatch(transaction);
                      }
                    })
                    .catch((error) => {
                      console.error("图片上传失败:", error);
                    });
                  return true;
                }
              }
              return false;
            },
            handlePaste: (view, event) => {
              // 处理图片粘贴上传
              if (
                event.clipboardData &&
                event.clipboardData.files &&
                event.clipboardData.files[0]
              ) {
                const file = event.clipboardData.files[0];
                if (file.type.startsWith("image/")) {
                  event.preventDefault();
                  handleImageUpload(file)
                    .then((url) => {
                      const { schema } = view.state;
                      const node = schema.nodes.image.create({ src: url });
                      const transaction =
                        view.state.tr.replaceSelectionWith(node);
                      view.dispatch(transaction);
                    })
                    .catch((error) => {
                      console.error("图片上传失败:", error);
                    });
                  return true;
                }
              }
              return false;
            },
          }}
        />
      </EditorRoot>
    </div>
  );
}
