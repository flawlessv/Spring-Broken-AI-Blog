"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Loader2,
  Wand2,
  FileText,
  Tag,
  ListTree,
  Pencil,
  Folder,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AI_GENERATION_TYPES, type AIGenerationType } from "@/lib/ai/constants";

// AI 推荐结果的类型（区分已存在和新建）
export interface AIRecommendation {
  existing: string[];
  new: string[];
}

interface AIAssistantProps {
  content: string;
  title: string;
  onTitleSelect?: (title: string) => void;
  onExcerptGenerated?: (excerpt: string) => void;
  onTagsGenerated?: (recommendation: AIRecommendation) => void;
  onCategoryGenerated?: (recommendation: AIRecommendation) => void;
  onContentInsert?: (text: string) => void;
  onContentReplace?: (text: string) => void; // 用于润色功能，替换整个内容
}

interface GenerationResult {
  type: AIGenerationType;
  results: string | string[] | AIRecommendation;
}

export default function AIAssistant({
  content,
  title,
  onTitleSelect,
  onExcerptGenerated,
  onTagsGenerated,
  onCategoryGenerated,
  onContentInsert,
  onContentReplace,
}: AIAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<AIGenerationType | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [generationResult, setGenerationResult] =
    useState<GenerationResult | null>(null);

  // 润色弹窗状态
  const [showPolishDialog, setShowPolishDialog] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isPolishing, setIsPolishing] = useState(false);

  const { toast } = useToast();

  const generateContent = async (type: AIGenerationType) => {
    // 润色功能使用单独的弹窗
    if (type === AI_GENERATION_TYPES.POLISH) {
      if (!content.trim()) {
        toast({
          title: "内容为空",
          description: "请先输入文章内容",
          variant: "warning",
        });
        return;
      }
      setShowPolishDialog(true);
      return;
    }

    if (!content.trim() && type !== AI_GENERATION_TYPES.OUTLINE) {
      toast({
        title: "内容为空",
        description: "请先输入文章内容",
        variant: "warning",
      });
      return;
    }

    setIsLoading(true);
    setLoadingType(type);

    try {
      const response = await fetch("/api/ai/write/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          content:
            type === AI_GENERATION_TYPES.OUTLINE
              ? title || "技术博客文章"
              : content,
          options: {
            count: type === AI_GENERATION_TYPES.TITLE ? 3 : undefined,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生成失败");
      }

      const data = await response.json();

      setGenerationResult({
        type,
        results: data.results,
      });
      setShowResultDialog(true);
    } catch (error) {
      console.error("AI 生成错误:", error);
      toast({
        title: "生成失败",
        description:
          error instanceof Error ? error.message : "AI 生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  // 执行全文润色
  const handlePolish = async () => {
    if (!content.trim()) {
      toast({
        title: "内容为空",
        description: "请先输入文章内容",
        variant: "warning",
      });
      return;
    }

    setIsPolishing(true);

    try {
      const response = await fetch("/api/ai/write/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: AI_GENERATION_TYPES.POLISH,
          content: content,
          options: { customPrompt: customPrompt.trim() || undefined },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "润色失败");
      }

      const data = await response.json();

      if (typeof data.results === "string") {
        // 显示结果让用户确认
        setGenerationResult({
          type: AI_GENERATION_TYPES.POLISH,
          results: data.results,
        });
        setShowPolishDialog(false);
        setShowResultDialog(true);
        setCustomPrompt("");
      }
    } catch (error) {
      console.error("润色失败:", error);
      toast({
        title: "润色失败",
        description:
          error instanceof Error ? error.message : "润色失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsPolishing(false);
    }
  };

  const handleResultSelect = (result?: string) => {
    if (!generationResult) return;

    switch (generationResult.type) {
      case AI_GENERATION_TYPES.TITLE:
        if (result) {
          onTitleSelect?.(result);
          toast({ title: "已应用标题", variant: "success" });
        }
        break;
      case AI_GENERATION_TYPES.EXCERPT:
        if (typeof generationResult.results === "string") {
          onExcerptGenerated?.(generationResult.results);
          toast({ title: "已生成摘要", variant: "success" });
        }
        break;
      case AI_GENERATION_TYPES.TAGS:
        if (isRecommendation(generationResult.results)) {
          onTagsGenerated?.(generationResult.results);
          toast({ title: "已生成标签推荐", variant: "success" });
        }
        break;
      case AI_GENERATION_TYPES.CATEGORY:
        if (isRecommendation(generationResult.results)) {
          onCategoryGenerated?.(generationResult.results);
          toast({ title: "已生成分类推荐", variant: "success" });
        }
        break;
      case AI_GENERATION_TYPES.OUTLINE:
        if (typeof generationResult.results === "string") {
          onContentInsert?.(generationResult.results);
          toast({ title: "已插入内容", variant: "success" });
        }
        break;
      case AI_GENERATION_TYPES.POLISH:
        if (typeof generationResult.results === "string") {
          // 润色功能使用 onContentReplace 替换整个内容
          onContentReplace?.(generationResult.results);
          toast({ title: "已应用润色内容", variant: "success" });
        }
        break;
    }

    setShowResultDialog(false);
  };

  // 类型守卫：判断是否为 AIRecommendation 类型
  const isRecommendation = (value: unknown): value is AIRecommendation => {
    return (
      typeof value === "object" &&
      value !== null &&
      "existing" in value &&
      "new" in value &&
      Array.isArray((value as AIRecommendation).existing) &&
      Array.isArray((value as AIRecommendation).new)
    );
  };

  const getTypeLabel = (type: AIGenerationType) => {
    const labels: Record<AIGenerationType, string> = {
      [AI_GENERATION_TYPES.TITLE]: "生成的标题",
      [AI_GENERATION_TYPES.EXCERPT]: "生成的摘要",
      [AI_GENERATION_TYPES.TAGS]: "推荐的标签",
      [AI_GENERATION_TYPES.CATEGORY]: "推荐的分类",
      [AI_GENERATION_TYPES.OUTLINE]: "生成的大纲",
      [AI_GENERATION_TYPES.EXPAND]: "扩展的内容",
      [AI_GENERATION_TYPES.POLISH]: "润色后的内容",
    };
    return labels[type];
  };

  // 渲染推荐结果（标签/分类）
  const renderRecommendation = (
    recommendation: AIRecommendation,
    type: typeof AI_GENERATION_TYPES.TAGS | typeof AI_GENERATION_TYPES.CATEGORY
  ) => {
    const isCategory = type === AI_GENERATION_TYPES.CATEGORY;
    const hasExisting = recommendation.existing.length > 0;
    const hasNew = recommendation.new.length > 0;

    return (
      <div className="space-y-4">
        {/* 已存在的推荐 */}
        {hasExisting && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <span>{isCategory ? "📁" : "🏷️"}</span>
              <span>从现有{isCategory ? "分类" : "标签"}中推荐</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recommendation.existing.map((item, index) => (
                <span
                  key={`existing-${index}`}
                  className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 新建议 */}
        {hasNew && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <span>➕</span>
              <span>建议新建</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recommendation.new.map((item, index) => (
                <span
                  key={`new-${index}`}
                  className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {!hasExisting && !hasNew && (
          <p className="text-muted-foreground text-sm">暂无推荐结果</p>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-3">
            💡 点击「应用推荐」后，在发布设置中可以选择使用或创建这些
            {isCategory ? "分类" : "标签"}
          </p>
          <Button className="w-full" onClick={() => handleResultSelect()}>
            应用推荐
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            AI 助手
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>内容生成</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => generateContent(AI_GENERATION_TYPES.TITLE)}
            disabled={isLoading}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {loadingType === AI_GENERATION_TYPES.TITLE
              ? "生成中..."
              : "生成标题"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => generateContent(AI_GENERATION_TYPES.EXCERPT)}
            disabled={isLoading}
          >
            <FileText className="h-4 w-4 mr-2" />
            {loadingType === AI_GENERATION_TYPES.EXCERPT
              ? "生成中..."
              : "生成摘要"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>智能推荐</DropdownMenuLabel>

          <DropdownMenuItem
            onClick={() => generateContent(AI_GENERATION_TYPES.CATEGORY)}
            disabled={isLoading}
          >
            <Folder className="h-4 w-4 mr-2" />
            {loadingType === AI_GENERATION_TYPES.CATEGORY
              ? "分析中..."
              : "推荐分类"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => generateContent(AI_GENERATION_TYPES.TAGS)}
            disabled={isLoading}
          >
            <Tag className="h-4 w-4 mr-2" />
            {loadingType === AI_GENERATION_TYPES.TAGS
              ? "分析中..."
              : "推荐标签"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>写作辅助</DropdownMenuLabel>

          <DropdownMenuItem
            onClick={() => generateContent(AI_GENERATION_TYPES.OUTLINE)}
            disabled={isLoading}
          >
            <ListTree className="h-4 w-4 mr-2" />
            {loadingType === AI_GENERATION_TYPES.OUTLINE
              ? "生成中..."
              : "生成大纲"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => generateContent(AI_GENERATION_TYPES.POLISH)}
            disabled={isLoading}
          >
            <Pencil className="h-4 w-4 mr-2" />
            全文润色
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 全文润色弹窗 */}
      <Dialog open={showPolishDialog} onOpenChange={setShowPolishDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-gray-900 dark:text-gray-100" />
              全文润色
            </DialogTitle>
            <DialogDescription>
              润色全文 ({content.length} 字)
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="润色要求（可选）：如使用更正式的语气..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPolishDialog(false);
                setCustomPrompt("");
              }}
              disabled={isPolishing}
            >
              取消
            </Button>
            <Button size="sm" onClick={handlePolish} disabled={isPolishing}>
              {isPolishing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  润色中
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  润色
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 结果对话框 */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gray-900 dark:text-gray-100" />
              {generationResult && getTypeLabel(generationResult.type)}
            </DialogTitle>
            <DialogDescription>
              {generationResult?.type === AI_GENERATION_TYPES.TAGS ||
              generationResult?.type === AI_GENERATION_TYPES.CATEGORY
                ? "AI 已分析文章内容，为你推荐以下选项"
                : generationResult?.type === AI_GENERATION_TYPES.POLISH
                  ? "查看润色后的内容，确认后将替换原文"
                  : "点击选择要使用的内容"}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {generationResult && (
              <>
                {/* 标签/分类推荐 - 新格式 */}
                {(generationResult.type === AI_GENERATION_TYPES.TAGS ||
                  generationResult.type === AI_GENERATION_TYPES.CATEGORY) &&
                  isRecommendation(generationResult.results) &&
                  renderRecommendation(
                    generationResult.results,
                    generationResult.type
                  )}

                {/* 标题选择 */}
                {generationResult.type === AI_GENERATION_TYPES.TITLE &&
                  Array.isArray(generationResult.results) && (
                    <div className="space-y-3">
                      {(generationResult.results as string[]).map(
                        (result, index) => (
                          <button
                            key={index}
                            onClick={() => handleResultSelect(result)}
                            className="w-full p-4 text-left border rounded-lg hover:bg-accent hover:border-primary transition-colors"
                          >
                            <span className="text-sm text-muted-foreground mr-2">
                              {index + 1}.
                            </span>
                            {result}
                          </button>
                        )
                      )}
                    </div>
                  )}

                {/* 单个结果（摘要、大纲、润色） */}
                {(generationResult.type === AI_GENERATION_TYPES.EXCERPT ||
                  generationResult.type === AI_GENERATION_TYPES.OUTLINE ||
                  generationResult.type === AI_GENERATION_TYPES.POLISH) &&
                  typeof generationResult.results === "string" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm leading-relaxed max-h-[400px] overflow-y-auto">
                        {generationResult.results}
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleResultSelect()}
                      >
                        {generationResult.type === AI_GENERATION_TYPES.EXCERPT
                          ? "使用此摘要"
                          : generationResult.type === AI_GENERATION_TYPES.POLISH
                            ? "应用润色内容（替换原文）"
                            : "插入到编辑器"}
                      </Button>
                    </div>
                  )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
