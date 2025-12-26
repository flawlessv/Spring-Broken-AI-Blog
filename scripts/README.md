# Spring Broken AI Blog - 部署脚本说明

本目录包含用于部署和管理 Spring Broken AI Blog 的脚本。

## 📜 脚本列表

### 1. ai-services.sh - AI 服务管理脚本

**用途:** 管理 Ollama 和 ChromaDB AI 服务

**用法:**

```bash
# 安装 AI 服务 (首次部署)
sudo ./ai-services.sh install

# 启动 AI 服务
sudo ./ai-services.sh start

# 停止 AI 服务
sudo ./ai-services.sh stop

# 重启 AI 服务
sudo ./ai-services.sh restart

# 查看服务状态
sudo ./ai-services.sh status
```

**功能:**

- ✅ 自动安装 Ollama 和 ChromaDB
- ✅ 配置 systemd 开机自启
- ✅ 启动/停止/重启服务
- ✅ 查看详细的服务状态
- ✅ 验证 API 响应
- ✅ 显示资源占用

**注意:**

- 需要 root 权限 (使用 sudo)
- 需要先安装 Docker
- install 命令仅在首次部署时使用

---

### 2. check-status.sh - 系统状态检查脚本

**用途:** 全面检查博客系统和 AI 服务的运行状态

**用法:**

```bash
./check-status.sh
```

**检查内容:**

- Node.js 和 npm 版本
- PM2 进程状态
- Ollama 服务状态
- ChromaDB 容器状态
- 端口占用情况 (80, 3000, 11434, 8000)
- 环境变量配置
- 数据库状态
- 构建文件状态
- 应用日志
- 磁盘和内存使用
- 应用访问测试

**输出示例:**

```
===================================
Spring Broken AI Blog - 状态检查
===================================

🔍 Node.js:
   ✅ 版本: v20.10.0

🤖 AI 服务状态:
   🔍 Ollama (向量生成):
      ✅ Ollama 服务运行中
      ✅ Ollama API 响应正常
      📦 已安装模型: nomic-embed-text

   🔍 ChromaDB (向量存储):
      ✅ ChromaDB 容器运行中
      ✅ ChromaDB API 响应正常
...
```

---

### 3. deploy-setup.sh - 服务器初始化脚本

**用途:** 在新服务器上首次部署项目

**用法:**

```bash
sudo ./deploy-setup.sh
```

**执行步骤:**

1. 检查 Node.js、npm、PM2
2. 创建 .env.production 模板
3. 安装项目依赖
4. 生成 Prisma Client
5. 初始化数据库
6. 构建项目
7. 启动 PM2 应用
8. 配置开机自启

**注意:**

- 仅在首次部署时使用
- 需要手动编辑环境变量文件
- 会提示是否创建管理员账户

---

### 4. update-deploy.sh - 更新部署脚本

**用途:** 更新已部署的应用到最新版本

**用法:**

```bash
./update-deploy.sh
```

**执行步骤:**

1. 备份当前版本
2. 拉取最新代码
3. 更新依赖
4. 生成 Prisma Client
5. 数据库迁移 (可选)
6. 构建项目
7. 重启 PM2 应用

**特点:**

- ✅ 自动备份当前版本
- ✅ 智能依赖更新检测
- ✅ 支持回滚

---

### 5. redeploy.sh - 快速重新部署脚本

**用途:** 快速重新部署 (不更新代码)

**用法:**

```bash
./redeploy.sh
```

**使用场景:**

- 修改了环境变量
- 需要重新构建
- 排查构建问题

---

## 🚀 快速开始

### 首次部署

```bash
# 1. 上传项目到服务器
git clone <your-repo> /www/wwwroot/spring-broken-ai-blog
cd /www/wwwroot/spring-broken-ai-blog

# 2. 运行初始化脚本
sudo ./scripts/deploy-setup.sh

# 3. 安装 AI 服务 (可选)
sudo ./scripts/ai-services.sh install

# 4. 检查状态
./scripts/check-status.sh
```

### 更新部署

```bash
# 方法 1: 使用更新脚本
./scripts/update-deploy.sh

# 方法 2: 使用 GitHub Actions
git push origin main  # 自动触发部署
```

### 管理 AI 服务

```bash
# 启动 AI 服务
sudo ./scripts/ai-services.sh start

# 查看状态
sudo ./scripts/ai-services.sh status

# 重启服务
sudo ./scripts/ai-services.sh restart
```

---

## 🔧 故障排查

### 问题 1: AI 服务无法启动

**解决步骤:**

```bash
# 1. 检查 Docker
docker --version
docker ps

# 2. 检查 Ollama
ollama --version
systemctl status ollama

# 3. 查看详细状态
sudo ./scripts/ai-services.sh status

# 4. 查看日志
journalctl -u ollama -f
docker logs -f chromadb
```

### 问题 2: 部署失败

**解决步骤:**

```bash
# 1. 检查环境变量
cat .env.production

# 2. 检查构建日志
pm2 logs spring-broken-ai-blog --lines 100

# 3. 检查端口占用
lsof -i :3000

# 4. 重新部署
./scripts/redeploy.sh
```

### 问题 3: PM2 应用无法启动

**解决步骤:**

```bash
# 1. 检查 Node.js 版本
node --version  # 应该是 v18 或更高

# 2. 检查构建文件
ls -la .next/

# 3. 手动测试
npm start

# 4. 查看 PM2 错误
pm2 describe spring-broken-ai-blog
```

---

## 📝 注意事项

1. **权限要求**
   - 所有脚本需要执行权限: `chmod +x scripts/*.sh`
   - AI 服务管理脚本需要 root 权限

2. **环境配置**
   - 确保正确配置 `.env.production`
   - AI 功能需要配置额外的环境变量

3. **备份建议**
   - 定期备份数据库
   - 定期备份 ChromaDB 数据
   - 保留代码回滚能力

4. **监控建议**
   - 定期运行 `check-status.sh` 检查系统状态
   - 配置日志轮转
   - 监控磁盘空间

---

## 📚 相关文档

- [部署指南](../docs/部署指南.md) - 完整的部署文档
- [启动指南](../docs/启动指南.md) - AI 服务启动说明
- [CLAUDE.md](../CLAUDE.md) - 开发指南

---

## 🆘 获取帮助

如果遇到问题:

1. 查看相关文档
2. 运行 `check-status.sh` 诊断问题
3. 查看日志文件
4. 提交 Issue 到项目仓库

---

**最后更新:** 2025-01-10
