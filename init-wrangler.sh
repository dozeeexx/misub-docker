#!/bin/bash
# 初始化 Wrangler 本地开发环境
# 这个脚本帮助设置本地调试所需的配置

set -e

echo "🚀 初始化 MiSub Wrangler 本地开发环境"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查 Wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler 未安装${NC}"
    echo "请先运行: npm install -g wrangler"
    exit 1
fi

echo -e "${GREEN}✅ Wrangler 已安装${NC}"
echo "版本: $(wrangler --version)"
echo ""

# 1️⃣ 检查配置文件
echo "📋 检查配置文件..."
echo "---"

if [ -f "wrangler.toml" ]; then
    echo -e "${YELLOW}⚠️  wrangler.toml 已存在${NC}"
    echo "   这个文件将被 git 忽略（在 .gitignore 中）"
else
    echo -e "${BLUE}ℹ️  建议：创建本地 wrangler.toml${NC}"
fi

if [ -f "wrangler.local.toml" ]; then
    echo -e "${GREEN}✅ wrangler.local.toml 存在${NC}"
fi

if [ -f "wrangler-cf-pages.toml" ]; then
    echo -e "${GREEN}✅ wrangler-cf-pages.toml 存在（用于部署）${NC}"
fi

echo ""

# 2️⃣ 创建本地 wrangler.toml（如果不存在）
echo "🔧 设置本地开发配置..."
echo "---"

if [ ! -f "wrangler.toml" ]; then
    echo -e "${YELLOW}创建 wrangler.toml...${NC}"
    cp wrangler.local.toml wrangler.toml
    echo -e "${GREEN}✅ wrangler.toml 已创建${NC}"
    echo "   使用 wrangler.local.toml 作为模板"
else
    echo -e "${BLUE}ℹ️  wrangler.toml 已存在，跳过创建${NC}"
fi

echo ""

# 3️⃣ 验证项目结构
echo "📁 验证项目结构..."
echo "---"

files=(
    "functions"
    "src"
    "package.json"
    ".gitignore"
)

for file in "${files[@]}"; do
    if [ -e "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file 不存在${NC}"
    fi
done

echo ""

# 4️⃣ 检查依赖
echo "📦 检查依赖..."
echo "---"

if grep -q "wrangler" package.json; then
    echo -e "${GREEN}✅ wrangler 在 package.json 中${NC}"
else
    echo -e "${YELLOW}⚠️  wrangler 不在 package.json 中${NC}"
fi

if grep -q "miniflare" package.json; then
    echo -e "${GREEN}✅ miniflare 已安装（本地调试）${NC}"
else
    echo -e "${YELLOW}⚠️  miniflare 未安装${NC}"
    echo "   建议运行: npm install -D miniflare"
fi

echo ""

# 5️⃣ 提示配置说明
echo "⚙️  配置说明..."
echo "---"
echo ""
echo -e "${BLUE}本地开发：${NC}"
echo "  1. 编辑 wrangler.toml（已从 wrangler.local.toml 复制）"
echo "  2. 根据需要更新配置"
echo "  3. 运行: npm run dev 或 wrangler dev"
echo ""
echo -e "${BLUE}Cloudflare Pages 部署：${NC}"
echo "  1. 参考 wrangler-cf-pages.toml"
echo "  2. 在 Cloudflare Pages UI 中配置："
echo "     - 环境变量"
echo "     - KV 命名空间"
echo "     - D1 数据库"
echo "     - Cron Triggers"
echo "  3. 不要将生产配置提交到 git"
echo ""

# 6️⃣ 环境变量设置
echo "🔑 环境变量设置..."
echo "---"

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local 存在${NC}"
else
    echo -e "${BLUE}ℹ️  建议创建 .env.local：${NC}"
    echo "    ENVIRONMENT=development"
    echo "    LOG_LEVEL=debug"
fi

echo ""

# 7️⃣ 最后建议
echo "✨ 初始化完成！"
echo "---"
echo ""
echo -e "${GREEN}现在可以开始本地调试：${NC}"
echo "  npm install      # 安装依赖"
echo "  npm run dev      # 启动开发服务器（如果配置了）"
echo "  wrangler dev     # 或使用 wrangler 直接启动"
echo ""

echo -e "${BLUE}重要提示：${NC}"
echo "  • wrangler.toml 已添加到 .gitignore，不会上传到 Git"
echo "  • 部署时，Cloudflare Pages 会自动处理配置"
echo "  • 不要在 wrangler.toml 中存储敏感信息"
echo "  • 定期查看 WRANGLER_CONFIG.md 获取最新配置建议"
echo ""

echo -e "${GREEN}更多信息请查看: WRANGLER_CONFIG.md${NC}"
echo ""
