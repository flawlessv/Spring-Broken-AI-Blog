"use client";

import { Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { AdminLoadingOverlay } from "@/components/ui/loading";
import { usePublishDialog } from "./hooks/use-publish-dialog";
import { CategorySection } from "./components/category-section";
import { TagSection } from "./components/tag-section";
import { PublishSettings } from "./components/publish-settings";
import { ExcerptField } from "./components/excerpt-field";
import type { PublishDialogProps } from "./types";

export default function PublishDialog({
  open,
  onOpenChange,
  onPublish,
  mode = "create",
  initialData,
  aiSuggestedTags,
  aiSuggestedCategories,
  articleContent,
}: PublishDialogProps) {
  const {
    form,
    isLoading,
    selectedTags,
    categories,
    tags,
    isCreatingTag,
    isCreatingCategory,
    effectiveAiTags,
    effectiveAiCategories,
    isGeneratingTags,
    isGeneratingCategories,
    isGeneratingExcerpt,
    handleSubmit,
    handleTagToggle,
    handleCreateTag,
    handleCreateCategory,
    generateCategories,
    generateTags,
    handleGenerateExcerpt,
  } = usePublishDialog({
    open,
    initialData,
    articleContent,
    aiSuggestedTags,
    aiSuggestedCategories,
    onPublish,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading && <AdminLoadingOverlay text="正在发布文章..." />}
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>{mode === "create" ? "发布文章" : "更新文章"}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            <CategorySection
              control={form.control}
              categories={categories}
              effectiveAiCategories={effectiveAiCategories}
              articleContent={articleContent}
              isCreating={isCreatingCategory}
              isGenerating={isGeneratingCategories}
              onSelectCategory={(id) => form.setValue("categoryId", id)}
              onCreateCategory={handleCreateCategory}
              onGenerateCategories={generateCategories}
            />

            <PublishSettings control={form.control} />

            <TagSection
              tags={tags}
              selectedTags={selectedTags}
              effectiveAiTags={effectiveAiTags}
              articleContent={articleContent}
              isCreating={isCreatingTag}
              isGenerating={isGeneratingTags}
              onToggle={handleTagToggle}
              onCreate={handleCreateTag}
              onGenerate={generateTags}
            />

            <ExcerptField
              control={form.control}
              articleContent={articleContent}
              isGenerating={isGeneratingExcerpt}
              onGenerate={handleGenerateExcerpt}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {mode === "create" ? "发布文章" : "更新文章"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
