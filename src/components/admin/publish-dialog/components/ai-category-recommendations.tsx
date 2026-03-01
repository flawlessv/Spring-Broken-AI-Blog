import { Loader2 } from "lucide-react";
import type { Category, AIRecommendation } from "../types";

interface AICategoryRecommendationsProps {
  recommendations?: AIRecommendation | null;
  categories: Category[];
  articleContent?: string;
  isCreating: boolean;
  isGenerating: boolean;
  onSelect: (categoryId: string) => void;
  onCreate: (name: string) => void;
  onGenerate: () => void;
}

export function AICategoryRecommendations({
  recommendations,
  categories,
  articleContent,
  isCreating,
  isGenerating,
  onSelect,
  onCreate,
  onGenerate,
}: AICategoryRecommendationsProps) {
  const hasRecommendations =
    recommendations &&
    (recommendations.existing.length > 0 || recommendations.new.length > 0);

  if (hasRecommendations) {
    return (
      <div className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
        <div className="flex items-center gap-1 text-xs text-gray-900 dark:text-gray-100 font-medium">
          <span>✨ AI 推荐分类</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {recommendations.existing.map((catName: string, index: number) => {
            const existingCat = categories.find(
              (c) => c.name.toLowerCase() === catName.toLowerCase()
            );
            if (!existingCat) return null;

            return (
              <button
                key={`existing-${index}`}
                type="button"
                onClick={() => onSelect(existingCat.id)}
                className="px-2 py-0.5 text-xs rounded transition-colors flex items-center gap-1 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
              >
                📁 {catName}
              </button>
            );
          })}

          {recommendations.new.map((catName: string, index: number) => (
            <button
              key={`new-${index}`}
              type="button"
              disabled={isCreating}
              onClick={() => onCreate(catName)}
              className="px-2 py-0.5 text-xs rounded transition-colors flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 disabled:opacity-50"
            >
              ➕ {catName}
              <span className="opacity-70">(新建)</span>
            </button>
          ))}
        </div>
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
            <span>AI 智能推荐分类</span>
          </>
        )}
      </button>
    );
  }

  return null;
}
