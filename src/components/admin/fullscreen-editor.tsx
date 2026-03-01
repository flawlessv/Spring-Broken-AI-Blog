"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Send, Save, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PublishDialog from "./publish-dialog";
import AIAssistant, { AIRecommendation } from "./ai-assistant";
import NovelEditorWrapper from "./novel-editor-wrapper";
import ImagePicker from "./image-picker";
import { jsonToMarkdown } from "@/lib/editor/markdown-converter";

interface FullscreenEditorProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onClose: () => void;
  onSave: () => void;
  onPublish: (data: PublishData) => void;
  isLoading?: boolean;
  mode?: "create" | "edit";
  initialPublishData?: Partial<PublishData>;
  postId?: string;
  postSlug?: string;
}

export interface PublishData {
  categoryId?: string;
  tags: string[];
  coverImage?: string;
  excerpt?: string;
  published: boolean;
  featured: boolean;
}

export default function FullscreenEditor({
  title,
  content,
  onTitleChange,
  onContentChange,
  onClose,
  onSave,
  onPublish,
  isLoading = false,
  mode = "create",
  initialPublishData,
  postId,
  postSlug,
}: FullscreenEditorProps) {
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const editorRef = useRef<any>(null); // 编辑器实例引用

  // AI 生成的数据（传递给发布对话框）
  const [aiExcerpt, setAiExcerpt] = useState<string | undefined>();
  const [aiTags, setAiTags] = useState<AIRecommendation | undefined>();
  const [aiCategories, setAiCategories] = useState<
    AIRecommendation | undefined
  >();

  // 计算字数和字符数
  useEffect(() => {
    const textContent = content.replace(/[#*`_\[\]()!-]/g, "").trim();
    setWordCount(
      textContent.split(/\s+/).filter((word) => word.length > 0).length
    );
    setCharCount(content.length);
  }, [content]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault();
            onSave();
            break;
          case "Enter":
            e.preventDefault();
            setShowPublishDialog(true);
            break;
          case "Escape":
            e.preventDefault();
            onClose();
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onSave, onClose]);

  const handlePublish = useCallback(
    (data: PublishData) => {
      onPublish(data);
      setShowPublishDialog(false);
    },
    [onPublish]
  );

  const handleInsertImage = useCallback(
    (markdown: string) => {
      const editor = editorRef.current;
      if (!editor) {
        console.error("编辑器未初始化");
        return;
      }

      // 提取图片 URL 和 alt 文本
      const srcMatch = markdown.match(/\((.*?)\)/);
      const altMatch = markdown.match(/\[(.*?)\]/);

      if (!srcMatch || !srcMatch[1]) {
        console.error("无效的 Markdown 格式");
        return;
      }

      // 插入图片到文档末尾（作为独立的块级节点）
      editor
        .chain()
        .focus("end")
        .insertContent([
          { type: "paragraph" },
          { type: "paragraph" },
          {
            type: "image",
            attrs: {
              src: srcMatch[1],
              alt: altMatch?.[1] || "",
            },
          },
          { type: "paragraph" },
        ])
        .run();

      // 手动触发内容同步（因为 insertContent 可能不会触发 onUpdate）
      setTimeout(() => {
        if (editor) {
          const json = editor.getJSON();
          const markdown = jsonToMarkdown(json);
          onContentChange(markdown);
        }
      }, 200);

      setShowImagePicker(false);
    },
    [onContentChange]
  );

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-semibold">
              {mode === "create" ? "新建文章" : "编辑文章"}
            </h1>
            {title && (
              <Badge variant="outline" className="text-xs">
                {title}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* 统计信息 */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{wordCount} 词</span>
            <span>{charCount} 字符</span>
          </div>

          {/* AI 助手 */}
          <AIAssistant
            content={content}
            title={title}
            onTitleSelect={(newTitle) => onTitleChange(newTitle)}
            onExcerptGenerated={(excerpt) => setAiExcerpt(excerpt)}
            onTagsGenerated={(tags) => setAiTags(tags)}
            onCategoryGenerated={(categories) => setAiCategories(categories)}
            onContentInsert={(text) => {
              // 将内容插入到编辑器末尾
              onContentChange(content + "\n\n" + text);
            }}
            onContentReplace={(text) => {
              // 润色功能：替换整个内容
              onContentChange(text);
            }}
          />

          {/* 操作按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImagePicker(true)}
            disabled={!postId}
            className="h-8"
            title={postId ? "插入图片" : "请先保存文章"}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            插入图片
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isLoading}
            className="h-8"
          >
            <Save className="h-4 w-4 mr-2" />
            保存草稿
          </Button>

          <Button
            size="sm"
            onClick={() => setShowPublishDialog(true)}
            disabled={isLoading || !title.trim() || !content.trim()}
            className="h-8"
          >
            <Send className="h-4 w-4 mr-2" />
            发布
          </Button>
        </div>
      </div>

      {/* 标题输入区域 */}
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="请输入文章标题..."
          className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground resize-none"
          autoFocus
        />
      </div>

      {/* Novel 编辑器区域 */}
      <div
        className="flex-1 overflow-auto relative"
        style={{ height: "calc(100vh - 140px)" }}
      >
        <div className="h-full w-full">
          <NovelEditorWrapper
            value={content}
            onChange={(val) => onContentChange(val || "")}
            placeholder="开始写作吧..."
            postId={postId}
            postSlug={postSlug}
            onEditorReady={(editor) => {
              editorRef.current = editor;
            }}
          />
        </div>
      </div>

      {/* 发布对话框 */}
      <PublishDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        onPublish={handlePublish}
        mode={mode}
        initialData={{
          ...initialPublishData,
          excerpt: aiExcerpt || initialPublishData?.excerpt,
        }}
        aiSuggestedTags={aiTags}
        aiSuggestedCategories={aiCategories}
        articleContent={content}
      />

      {/* 图片选择器 */}
      <ImagePicker
        open={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        postId={postId}
        onInsertImage={handleInsertImage}
      />
    </div>
  );
}
