"use client";

import { useEffect, useRef } from "react";

interface Flower {
  x: number;
  y: number;
  size: number;
  opacity: number;
  scale: number;
  textOpacity: number;
}

export function FlowerClick() {
  const flowersRef = useRef<Flower[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置 canvas 尺寸
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 绘制小红花（5个花瓣，更圆润饱满）
    const drawFlower = (
      x: number,
      y: number,
      size: number,
      opacity: number
    ) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(x, y);

      // 绘制5个花瓣
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / 5);

        // 红色花瓣渐变（更饱满的颜色）
        const gradient = ctx.createRadialGradient(
          0,
          -size * 0.5,
          0,
          0,
          -size * 0.5,
          size
        );
        gradient.addColorStop(0, "rgba(255, 90, 90, 1)");
        gradient.addColorStop(0.3, "rgba(255, 70, 70, 0.98)");
        gradient.addColorStop(0.6, "rgba(235, 30, 60, 0.95)");
        gradient.addColorStop(1, "rgba(190, 20, 50, 0.9)");

        ctx.fillStyle = gradient;
        ctx.beginPath();

        // 绘制更饱满圆润的花瓣
        const petalLength = size;
        const petalWidth = size * 0.85; // 更宽的花瓣

        // 花瓣起点（花心附近）
        ctx.moveTo(0, -size * 0.12);

        // 左侧饱满曲线
        ctx.bezierCurveTo(
          -petalWidth * 0.5,
          -petalLength * 0.3,
          -petalWidth * 0.65,
          -petalLength * 0.55,
          -petalWidth * 0.45,
          -petalLength * 0.8
        );

        // 花瓣顶端（更圆润）
        ctx.bezierCurveTo(
          -petalWidth * 0.25,
          -petalLength * 0.95,
          petalWidth * 0.25,
          -petalLength * 0.95,
          petalWidth * 0.45,
          -petalLength * 0.8
        );

        // 右侧饱满曲线
        ctx.bezierCurveTo(
          petalWidth * 0.65,
          -petalLength * 0.55,
          petalWidth * 0.5,
          -petalLength * 0.3,
          0,
          -size * 0.12
        );

        ctx.fill();

        // 添加花瓣高光（更明显）
        const highlight = ctx.createRadialGradient(
          -petalWidth * 0.2,
          -petalLength * 0.55,
          0,
          -petalWidth * 0.2,
          -petalLength * 0.55,
          petalWidth * 0.35
        );
        highlight.addColorStop(0, "rgba(255, 220, 220, 0.5)");
        highlight.addColorStop(0.5, "rgba(255, 200, 200, 0.25)");
        highlight.addColorStop(1, "rgba(255, 200, 200, 0)");
        ctx.fillStyle = highlight;
        ctx.fill();

        ctx.restore();
      }

      // 绘制花心（更大更亮）
      const centerSize = size * 0.28;
      const centerGradient = ctx.createRadialGradient(
        -centerSize * 0.25,
        -centerSize * 0.25,
        0,
        0,
        0,
        centerSize
      );
      centerGradient.addColorStop(0, "rgba(255, 245, 120, 1)");
      centerGradient.addColorStop(0.4, "rgba(255, 225, 50, 1)");
      centerGradient.addColorStop(0.8, "rgba(255, 200, 0, 0.95)");
      centerGradient.addColorStop(1, "rgba(240, 180, 0, 0.9)");

      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(0, 0, centerSize, 0, Math.PI * 2);
      ctx.fill();

      // 花心点缀（更明显的小点）
      ctx.fillStyle = "rgba(255, 190, 0, 0.9)";
      for (let j = 0; j < 5; j++) {
        const angle = (j * Math.PI * 2) / 5;
        const dotRadius = centerSize * 0.55;
        const dotX = Math.cos(angle) * dotRadius;
        const dotY = Math.sin(angle) * dotRadius;
        ctx.beginPath();
        ctx.arc(dotX, dotY, centerSize * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    // 绘制文字（更小）
    const drawText = (x: number, y: number, text: string, opacity: number) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font =
        "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillStyle = "rgba(255, 50, 50, 0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // 文字阴影
      ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillText(text, x, y - 50);
      ctx.restore();
    };

    // 点击事件（只在非链接元素上触发）
    const handleClick = (e: MouseEvent) => {
      // 检查点击目标是否是链接或链接内部
      const target = e.target as HTMLElement;
      const isLink = target.closest('a, button, [role="button"]');

      // 如果是交互元素，不触发小红花
      if (isLink) return;

      flowersRef.current.push({
        x: e.clientX,
        y: e.clientY,
        size: 0,
        opacity: 1,
        scale: 0,
        textOpacity: 1,
      });

      // 限制花朵数量
      if (flowersRef.current.length > 5) {
        flowersRef.current.shift();
      }
    };

    window.addEventListener("click", handleClick);

    // 动画循环
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      flowersRef.current = flowersRef.current.filter((flower) => {
        // 更新花朵状态（更小的尺寸）
        flower.size += 0.6;
        flower.scale = Math.min(flower.scale + 0.06, 1);
        flower.opacity -= 0.008;
        flower.textOpacity -= 0.01;

        if (flower.opacity <= 0) return false;

        // 绘制花朵（最大尺寸为18）
        const maxSize = 18;
        const currentSize = Math.min(flower.size * flower.scale, maxSize);
        drawFlower(flower.x, flower.y, currentSize, flower.opacity);

        // 绘制文字
        if (flower.textOpacity > 0) {
          drawText(flower.x, flower.y, "送你一朵小红花 ❤", flower.textOpacity);
        }

        return true;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // 清理
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("click", handleClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}
