import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import AboutContent from "@/components/about/about-content";

export const metadata: Metadata = {
  title: "关于我 - Spring Broken AI Blog",
  description: "了解更多关于我的信息",
};

export default function AboutPage() {
  return (
    <PublicLayout
      leftButtons={
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-1.5 border-[2px] border-black dark:border-white rounded-full text-sm font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>返回首页</span>
        </Link>
      }
    >
      <AboutContent />
    </PublicLayout>
  );
}
