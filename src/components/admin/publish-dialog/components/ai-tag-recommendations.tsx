import { Loader2 } from "lucide-react";
import type { Tag, AIRecommendation } from "../types";

interface AITagRecommendationsProps {
  recommendations?: AIRecommendation | null;
  tags: Tag[];
  selectedTags: string[];
  articleContent?: string;
  isCreating: boolean;
  isGenerating: boolean;
  onToggle: (tagId: string) => void;
  onCreate: (name: string) => void;
  onGenerate: () => void;
}

export function AITagRecommendations({
  recommendations,
  tags,
  selectedTags,
  articleContent,
  isCreating,
  isGenerating,
  onToggle,
  onCreate,
  onGenerate,
}: AITagRecommendationsProps) {
  const hasRecommendations =
    recommendations &&
    (recommendations.existing.length > 0 || recommendations.new.length > 0);

  if (hasRecommendations) {
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-100 font-medium">
          <span>✨ AI 推荐标签</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {recommendations.existing.map((tagName, index) => {
            const existingTag = tags.find(
              (t) => t.name.toLowerCase() === tagName.toLowerCase()
            );
            if (!existingTag) return null;

            const isSelected = selectedTags.includes(existingTag.id);

            return (
              <button
                key={`existing-${index}`}
                type="button"
                onClick={() => onToggle(existingTag.id)}
                className={`px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                  isSelected
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                🏷️ {tagName}
              </button>
            );
          })}

          {recommendations.new.map((tagName, index) => (
            <button
              key={`new-${index}`}
              type="button"
              disabled={isCreating}
              onClick={() => onCreate(tagName)}
              className="px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 disabled:opacity-50"
            >
              ➕ {tagName}
              <span className="opacity-70">(新建)</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          🏷️ 点击选择已有标签 · ➕ 点击创建新标签
        </p>
      </div>
    );
  }

  if (articleContent?.trim()) {
    return (
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full p-2 text-xs border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>AI 分析中...</span>
          </>
        ) : (
          <>
            <span>✨</span>
            <span>AI 智能推荐标签</span>
          </>
        )}
      </button>
    );
  }

  return null;
}
