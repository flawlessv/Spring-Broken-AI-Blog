"use client";

import { Snowfall } from "react-snowfall";
import { useTheme } from "@/components/providers/theme-provider";
import { useEffect, useState } from "react";

export function SeasonalBackground() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 避免服务器端渲染不一致
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || theme !== "dark") {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Snowfall
        snowflakeCount={60}
        radius={[0.5, 3.0]}
        speed={[0.5, 2.0]}
        wind={[-0.5, 2.0]}
        color="#ffffff"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0.4,
        }}
      />
    </div>
  );
}
