import { Image as ImageIcon } from "lucide-react";
import {
  FormField,
  FormItem,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control } from "react-hook-form";
import type { PublishFormData } from "../types";

interface CoverImageFieldProps {
  control: Control<PublishFormData>;
}

export function CoverImageField({ control }: CoverImageFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-sm font-medium">
        <ImageIcon className="h-4 w-4" />
        <span>封面图片</span>
      </div>
      <FormField
        control={control}
        name="coverImage"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input placeholder="图片 URL (可选)" {...field} />
            </FormControl>
            <FormDescription className="text-xs">
              输入远程图床的封面图片 URL（例如：https://example.com/image.jpg）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
