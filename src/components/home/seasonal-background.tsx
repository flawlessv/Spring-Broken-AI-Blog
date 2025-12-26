"use client";

import { Snowfall } from "react-snowfall";

export function SeasonalBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Snowfall
        snowflakeCount={40}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
