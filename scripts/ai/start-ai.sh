#!/bin/bash

# Spring Broken AI Blog - AI 服务启动脚本
# 启动 Ollama 和 ChromaDB 服务

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "==================================="
echo "启动 AI 服务"
echo "==================================="
echo ""

# 数据目录
CHROMA_DIR="./data/chroma"
mkdir -p "$CHROMA_DIR"

# 1. 启动 Ollama
echo "🤖 启动 Ollama..."
if pgrep -f "ollama serve" > /dev/null; then
    print_warning "Ollama 已在运行"
else
    ollama serve > /tmp/ollama.log 2>&1 &
    sleep 3
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        print_success "Ollama 启动成功"
    else
        print_error "Ollama 启动失败，查看日志: cat /tmp/ollama.log"
        exit 1
    fi
fi
echo ""

# 2. 启动 ChromaDB (使用 npx)
echo "📦 启动 ChromaDB..."
if pgrep -f "chroma run" > /dev/null; then
    print_warning "ChromaDB 已在运行"
else
    npx chromadb run --path "$CHROMA_DIR" --port 8000 > /tmp/chromadb.log 2>&1 &
    sleep 5
    if curl -s http://localhost:8000/api/v2/heartbeat > /dev/null 2>&1; then
        print_success "ChromaDB 启动成功"
    else
        print_error "ChromaDB 启动失败，查看日志: cat /tmp/chromadb.log"
        exit 1
    fi
fi
echo ""

# 3. 检查模型
echo "🔍 检查 Embedding 模型..."
if ollama list 2>/dev/null | grep -q "nomic-embed-text"; then
    print_success "模型已安装"
else
    print_warning "正在下载 nomic-embed-text 模型..."
    ollama pull nomic-embed-text
    print_success "模型下载完成"
fi
echo ""

echo "==================================="
print_success "AI 服务启动完成！"
echo "==================================="
echo ""
echo "📝 服务地址:"
echo "   Ollama:   http://localhost:11434"
echo "   ChromaDB: http://localhost:8000"
echo ""
echo "📝 查看日志:"
echo "   Ollama:   tail -f /tmp/ollama.log"
echo "   ChromaDB: tail -f /tmp/chromadb.log"
echo ""
echo "📝 停止服务:"
echo "   ./stop-ai.sh"
echo ""
