"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { User, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ImageUpload from "./image-upload";

const profileSchema = z.object({
  // 基础信息
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().optional(),
  displayName: z.string().optional(),
  bio: z.string().max(500, "简介不能超过500字符").optional(),
  avatar: z.string().optional(),

  // 联系信息
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
  wechat: z.string().optional(),

  // 社交链接
  github: z.string().optional(),
  twitter: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileForm() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
      bio: "",
      avatar: "",
      email: "",
      wechat: "",
      github: "",
      twitter: "",
    },
  });

  // 加载用户数据
  useEffect(() => {
    if (session?.user) {
      loadProfile();
    }
  }, [session]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/profile");

      if (response.ok) {
        const data = await response.json();
        form.reset({
          username: data.username || "",
          password: "",
          displayName: data.profile?.displayName || "",
          bio: data.profile?.bio || "",
          avatar: data.profile?.avatar || "",
          email: data.profile?.email || "",
          wechat: data.profile?.wechat || "",
          github: data.profile?.github || "",
          twitter: data.profile?.twitter || "",
        });
      }
    } catch (error) {
      console.error("加载用户资料失败:", error);
      toast({
        title: "加载失败",
        description: "无法加载用户资料",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "更新失败");
      }

      const result = await response.json();

      // 更新会话信息，使用返回的最新用户数据
      if (session) {
        await update({
          ...session,
          user: {
            ...session.user,
            ...result.user,
          },
        });
      }

      toast({
        title: "更新成功",
        description: "个人信息已更新",
        variant: "success",
      });
    } catch (error) {
      console.error("更新失败:", error);
      toast({
        title: "更新失败",
        description:
          error instanceof Error ? error.message : "更新失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !form.formState.isSubmitting) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 头像 */}
        <FormField
          control={form.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>头像</FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  type="avatar"
                  aspectRatio="1:1"
                />
              </FormControl>
              <FormDescription>
                上传头像图片，推荐尺寸 400 x 400 px (1:1)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 基础信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>用户名</FormLabel>
                <FormControl>
                  <Input placeholder="输入用户名" {...field} />
                </FormControl>
                <FormDescription>用于登录的用户名</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>密码</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="留空则不修改密码"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>留空则不修改当前密码</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>显示名称</FormLabel>
              <FormControl>
                <Input placeholder="输入显示名称" {...field} />
              </FormControl>
              <FormDescription>在前台显示的昵称</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>个人简介</FormLabel>
              <FormControl>
                <Textarea placeholder="介绍一下自己..." rows={4} {...field} />
              </FormControl>
              <FormDescription>最多500字符</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 联系信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>邮箱</FormLabel>
                <FormControl>
                  <Input placeholder="example@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="wechat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>微信号</FormLabel>
                <FormControl>
                  <Input placeholder="微信号" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 社交链接 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="github"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GitHub</FormLabel>
                <FormControl>
                  <Input placeholder="GitHub用户名或链接" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="twitter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Twitter (X)</FormLabel>
                <FormControl>
                  <Input placeholder="Twitter用户名或链接" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 提交按钮 */}
        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            保存更改
          </Button>
        </div>
      </form>
    </Form>
  );
}
