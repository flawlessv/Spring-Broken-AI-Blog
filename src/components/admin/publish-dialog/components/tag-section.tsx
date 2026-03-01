import { Tag } from "lucide-react";
import type { Tag as TagType, AIRecommendation } from "../types";

interface TagSectionProps {
  tags: TagType[];
  selectedTags: string[];
  effectiveAiTags?: AIRecommendation | null;
  articleContent?: string;
  isCreating: boolean;
  isGenerating: boolean;
  onToggle: (tagId: string) => void;
  onCreate: (name: string) => void;
  onGenerate: () => void;
}

export function TagSection({
  tags,
  selectedTags,
  effectiveAiTags,
  articleContent,
  isCreating,
  isGenerating,
  onToggle,
  onCreate,
  onGenerate,
}: TagSectionProps) {
  const hasRecommendations =
    effectiveAiTags &&
    (effectiveAiTags.existing.length > 0 || effectiveAiTags.new.length > 0);
  const canGenerate = articleContent?.trim() && !hasRecommendations;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm font-medium">
          <Tag className="h-4 w-4" />
          <span>标签</span>
          {selectedTags.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({selectedTags.length})
            </span>
          )}
        </div>

        {/* AI 生成按钮 - 小按钮放在右边 */}
        {canGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <span className="text-xs">✨</span>
            {isGenerating ? "分析中..." : "AI 推荐"}
          </button>
        )}
      </div>

      {/* AI 推荐结果 */}
      {hasRecommendations && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
          {effectiveAiTags.existing.map((tagName: string, index: number) => {
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
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  isSelected
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
                }`}
              >
                {tagName}
              </button>
            );
          })}

          {effectiveAiTags.new.map((tagName: string, index: number) => (
            <button
              key={`new-${index}`}
              type="button"
              disabled={isCreating}
              onClick={() => onCreate(tagName)}
              className="px-2 py-0.5 text-xs rounded transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 border border-dashed border-gray-300 dark:border-gray-600 disabled:opacity-50"
            >
              + {tagName}
            </button>
          ))}
        </div>
      )}

      {/* 标签选择网格 */}
      <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md">
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              className={`px-2 py-1 text-xs rounded-md transition-all ${
                isSelected
                  ? "bg-black dark:bg-white text-white dark:text-black font-medium"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
              }`}
            >
              {tag.name}
            </button>
          );
        })}

        {tags.length === 0 && (
          <p className="text-xs text-muted-foreground">暂无标签</p>
        )}
      </div>
    </div>
  );
}
