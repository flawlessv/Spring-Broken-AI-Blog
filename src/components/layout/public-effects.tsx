"use client";

import { usePathname } from "next/navigation";
import { SeasonalBackground } from "@/components/home/seasonal-background";
import { FlowerClick } from "@/components/home/flower-click";

export default function PublicEffects() {
  const pathname = usePathname();
  const isPublicRoute =
    !!pathname && !pathname.startsWith("/admin") && pathname !== "/login";

  if (!isPublicRoute) {
    return null;
  }

  return (
    <>
      <SeasonalBackground />
      <FlowerClick />
    </>
  );
}
