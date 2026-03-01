"use client";

import React, { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminProfile {
  id: string;
  username: string;
  email?: string;
  profile?: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    email?: string;
    github?: string;
    twitter?: string;
    wechat?: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

interface AdminProfileCardProps {
  profile: AdminProfile | null;
  categories: Category[];
}

function AdminProfileCard({ profile, categories }: AdminProfileCardProps) {
  if (!profile) {
    return null;
  }

  const { displayName, bio, avatar } = profile.profile || {};

  return (
    <TooltipProvider>
      <div
        className="lg:sticky lg:top-12 w-full flex flex-col items-start font-sans"
        suppressHydrationWarning
      >
        {/* 顶部个人信息区域 */}
        <div className="flex items-start justify-between w-full relative pr-12">
          <div className="flex-1 space-y-4">
            {/* 头像 - 直接使用 Next.js Image */}
            <div className="w-28 h-28 rounded-full border-[6px] border-black dark:border-white overflow-hidden bg-white flex-shrink-0 shadow-md">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={displayName || profile.username}
                  width={112}
                  height={112}
                  priority
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-20 h-20 text-gray-200" strokeWidth={1} />
                </div>
              )}
            </div>

            {/* 名字与简介 */}
            <div className="space-y-3">
              <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight">
                {displayName || profile.username}
              </h1>

              {/* 简介 - 进一步增大字体，水平排列 */}
              {bio && (
                <div className="text-[18px] text-gray-600 dark:text-gray-600 font-light flex flex-wrap items-center gap-x-2 leading-none">
                  {bio.includes("|") ? (
                    bio.split("|").map((part, i) => (
                      <React.Fragment key={i}>
                        <span className="whitespace-nowrap">{part.trim()}</span>
                        {i < bio.split("|").length - 1 && (
                          <span className="text-gray-200">|</span>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <span>{bio}</span>
                  )}
                </div>
              )}
            </div>

            {/* 关于我按钮 */}
            <div className="pt-0.5">
              <Link
                href="/about"
                className="inline-block px-5 py-1.5 border-[3px] border-black dark:border-white rounded-full text-[12px] font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300"
              >
                About Me
              </Link>
            </div>
          </div>

          {/* 装饰蓝线 - 对齐头像顶部 */}
          <div className="w-[4px] h-20 bg-[#0047AB] absolute right-4 top-0 hidden lg:block opacity-90"></div>
        </div>

        {/* 分类导航 - 彩色图标，适度加粗 */}
        <nav className="w-full mt-6">
          <ul className="space-y-1.5">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/?category=${category.slug}`}
                  className="flex items-center gap-3 text-[15px] text-black dark:text-white hover:opacity-70 transition-all group"
                >
                  <span className="text-lg opacity-100">
                    {category.icon || "📄"}
                  </span>
                  <span className="font-semibold tracking-tight">
                    {category.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 底部社交 - 强化图标颜色 */}
        <div className="w-full mt-8">
          <div className="flex gap-5 text-gray-500">
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={profile.profile?.github || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-black transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>{profile.profile?.github || "GitHub"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`mailto:${profile.profile?.email || profile.email}`}
                  className="hover:text-black transition-colors"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>{profile.profile?.email || profile.email || "邮箱"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={profile.profile?.twitter || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-black transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>{profile.profile?.twitter || "Twitter"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={
                    profile.profile?.wechat
                      ? `weixin://dl/chat?${profile.profile.wechat}`
                      : "#"
                  }
                  className="hover:text-black transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z" />
                  </svg>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>{profile.profile?.wechat || "微信"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default memo(AdminProfileCard);
AdminProfileCard.displayName = "AdminProfileCard";
