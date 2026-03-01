import { Folder } from "lucide-react";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Control } from "react-hook-form";
import type { PublishFormData, Category, AIRecommendation } from "../types";

interface CategorySectionProps {
  control: Control<PublishFormData>;
  categories: Category[];
  effectiveAiCategories?: AIRecommendation | null;
  articleContent?: string;
  isCreating: boolean;
  isGenerating: boolean;
  onSelectCategory: (categoryId: string) => void;
  onCreateCategory: (name: string) => void;
  onGenerateCategories: () => void;
}

export function CategorySection({
  control,
  categories,
  effectiveAiCategories,
  articleContent,
  isCreating,
  isGenerating,
  onSelectCategory,
  onCreateCategory,
  onGenerateCategories,
}: CategorySectionProps) {
  const hasRecommendations =
    effectiveAiCategories &&
    (effectiveAiCategories.existing.length > 0 ||
      effectiveAiCategories.new.length > 0);
  const canGenerate = articleContent?.trim() && !hasRecommendations;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm font-medium">
          <Folder className="h-4 w-4" />
          <span>分类</span>
        </div>

        {/* AI 生成按钮 - 小按钮放在右边 */}
        {canGenerate && (
          <button
            type="button"
            onClick={onGenerateCategories}
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
          {effectiveAiCategories.existing.map(
            (catName: string, index: number) => {
              const existingCat = categories.find(
                (c) => c.name.toLowerCase() === catName.toLowerCase()
              );
              if (!existingCat) return null;

              return (
                <button
                  key={`existing-${index}`}
                  type="button"
                  onClick={() => onSelectCategory(existingCat.id)}
                  className="px-2 py-0.5 text-xs rounded transition-colors bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
                >
                  {catName}
                </button>
              );
            }
          )}

          {effectiveAiCategories.new.map((catName: string, index: number) => (
            <button
              key={`new-${index}`}
              type="button"
              disabled={isCreating}
              onClick={() => onCreateCategory(catName)}
              className="px-2 py-0.5 text-xs rounded transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 border border-dashed border-gray-300 dark:border-gray-600 disabled:opacity-50"
            >
              + {catName}
            </button>
          ))}
        </div>
      )}

      <FormField
        control={control}
        name="categoryId"
        render={({ field }) => (
          <FormItem>
            <Select
              onValueChange={(v) =>
                field.onChange(v === "none" ? undefined : v)
              }
              value={field.value ?? "none"}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">无分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
