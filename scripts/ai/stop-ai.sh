#!/bin/bash

# Spring Broken AI Blog - 停止 AI 服务脚本

echo "==================================="
echo "停止 AI 服务"
echo "==================================="
echo ""

# 停止 Ollama
echo "🤖 停止 Ollama..."
if pgrep -f "ollama serve" > /dev/null; then
    pkill -f "ollama serve"
    echo "✅ Ollama 已停止"
else
    echo "⚠️  Ollama 未运行"
fi
echo ""

# 停止 ChromaDB
echo "📦 停止 ChromaDB..."
if pgrep -f "chroma run" > /dev/null; then
    pkill -f "chroma run"
    echo "✅ ChromaDB 已停止"
else
    echo "⚠️  ChromaDB 未运行"
fi
echo ""

echo "==================================="
echo "✅ AI 服务已停止"
echo "==================================="
echo ""
