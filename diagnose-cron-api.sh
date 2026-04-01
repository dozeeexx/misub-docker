#!/bin/bash
# Cron API 诊断脚本
# 检查API处理器是否正确配置

echo "🔍 Cron API 诊断"
echo "================="
echo ""

# 1. 检查API处理器文件
echo "1️⃣  检查API处理器文件..."
echo "---"

if [ -f "functions/api/[[path]].js" ]; then
    echo "  ✅ functions/api/[[path]].js 存在"
    lines=$(wc -l < functions/api/[[path]].js)
    echo "     代码行数: $lines"
else
    echo "  ❌ functions/api/[[path]].js 不存在"
    echo "     需要创建此文件来处理 /api/* 路由"
fi

if [ -f "functions/api/cron.js" ]; then
    echo "  ✅ functions/api/cron.js 存在"
    lines=$(wc -l < functions/api/cron.js)
    echo "     代码行数: $lines"
else
    echo "  ℹ️  functions/api/cron.js 不存在（可选）"
fi

echo ""

# 2. 检查管理面板文件
echo "2️⃣  检查管理面板文件..."
echo "---"

if [ -f "functions/cron-dashboard.js" ]; then
    echo "  ✅ functions/cron-dashboard.js 存在"
    lines=$(wc -l < functions/cron-dashboard.js)
    echo "     代码行数: $lines"
    
    # 检查是否有API调用
    if grep -q "/api/cron" functions/cron-dashboard.js; then
        echo "  ✅ 包含 /api/cron 调用"
        grep "/api/cron" functions/cron-dashboard.js | head -3 | sed 's/^/     /'
    else
        echo "  ❌ 不包含 /api/cron 调用"
    fi
else
    echo "  ❌ functions/cron-dashboard.js 不存在"
fi

echo ""

# 3. 检查 API 请求处理
echo "3️⃣  检查 API 请求处理..."
echo "---"

if [ -f "functions/api/[[path]].js" ]; then
    if grep -q "handleGetStatus" functions/api/[[path]].js; then
        echo "  ✅ 实现了 handleGetStatus 函数"
    fi
    
    if grep -q "handleTriggerSync" functions/api/[[path]].js; then
        echo "  ✅ 实现了 handleTriggerSync 函数"
    fi
    
    if grep -q "/api/cron/status" functions/api/[[path]].js; then
        echo "  ✅ 处理 /api/cron/status 路由"
    fi
    
    if grep -q "/api/cron/trigger" functions/api/[[path]].js; then
        echo "  ✅ 处理 /api/cron/trigger 路由"
    fi
else
    echo "  ❌ API处理器文件不存在"
fi

echo ""

# 4. 检查路由配置
echo "4️⃣  检查路由配置..."
echo "---"

if [ -f "wrangler.toml" ]; then
    if grep -q "triggers" wrangler.toml; then
        echo "  ✅ wrangler.toml 中配置了 triggers"
        echo "     配置内容:"
        grep -A 5 "triggers" wrangler.toml | sed 's/^/     /'
    else
        echo "  ⚠️  wrangler.toml 中没有配置 triggers"
        echo "     建议添加以下配置:"
        echo '     [triggers]'
        echo '     crons = ["0 * * * *"]'
    fi
else
    echo "  ⚠️  wrangler.toml 不存在"
fi

echo ""

# 5. 检查文件结构
echo "5️⃣  检查文件结构..."
echo "---"

echo "  Functions 目录结构:"
if [ -d "functions" ]; then
    find functions -type f -name "*.js" | grep -E "(api|cron)" | sort | sed 's/^/    /'
    if [ -z "$(find functions -type f -name '*api*' -or -name '*cron*')" ]; then
        echo "    (未找到相关文件)"
    fi
else
    echo "  ❌ functions 目录不存在"
fi

echo ""

# 6. 检查 KV 配置
echo "6️⃣  检查环境变量配置..."
echo "---"

if grep -q "KV\|kv" wrangler.toml 2>/dev/null; then
    echo "  ✅ 配置了 KV 存储"
    grep -i "kv" wrangler.toml | sed 's/^/     /'
else
    echo "  ℹ️  没有配置 KV 存储（可选）"
    echo "     可以添加以下配置用于状态存储:"
    echo "     [[env.production.kv_namespaces]]"
    echo "     binding = \"KV_STORAGE\""
    echo "     id = \"your-namespace-id\""
fi

echo ""

# 7. 测试和验证
echo "7️⃣  测试和验证..."
echo "---"

if npm run test:run > /dev/null 2>&1; then
    echo "  ✅ 单元测试通过"
else
    echo "  ❌ 单元测试失败"
    echo "     运行 npm run test:run 查看详细错误"
fi

echo ""

# 8. 诊断总结
echo "8️⃣  诊断总结..."
echo "---"

missing_files=0

if [ ! -f "functions/api/[[path]].js" ]; then
    echo "  ❌ 缺少 functions/api/[[path]].js"
    missing_files=$((missing_files + 1))
fi

if [ ! -f "functions/cron-dashboard.js" ]; then
    echo "  ❌ 缺少 functions/cron-dashboard.js"
    missing_files=$((missing_files + 1))
fi

if [ $missing_files -eq 0 ]; then
    echo "  ✅ 所有必需文件都已存在"
    echo "     可以尝试以下步骤解决问题:"
    echo ""
    echo "    1. 重新部署:"
    echo "       npm run deploy"
    echo ""
    echo "    2. 清除浏览器缓存后访问:"
    echo "       https://your-domain.pages.dev/cron-dashboard"
    echo ""
    echo "    3. 检查浏览器控制台错误 (F12)"
    echo ""
    echo "    4. 查看 Cloudflare Pages 部署日志"
else
    echo "  ❌ 缺少 $missing_files 个文件"
    echo "     需要先创建这些文件才能使用管理面板"
fi

echo ""
echo "📖 更多信息请查看: CRON_DASHBOARD_GUIDE.md"
echo ""
