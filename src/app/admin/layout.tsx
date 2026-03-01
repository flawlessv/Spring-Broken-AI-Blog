import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理后台 - Spring Broken AI Blog",
  description: "Spring Broken AI Blog 博客管理后台",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✨</text></svg>",
      },
    ],
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
