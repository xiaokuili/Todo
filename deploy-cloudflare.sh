#!/bin/bash

# Cloudflare 部署快速脚本
# 使用方法: ./deploy-cloudflare.sh

set -e

echo "🚀 开始部署到 Cloudflare Pages..."
echo ""

# 检查是否安装了 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ 未安装 Wrangler CLI"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "❌ 未登录 Wrangler"
    echo "请运行: wrangler login"
    exit 1
fi

# 检查 wrangler.toml 中是否配置了 KV ID
if grep -q 'id = ""' wrangler.toml; then
    echo "⚠️  警告: wrangler.toml 中的 KV 命名空间 ID 未配置"
    echo ""
    echo "请先创建 KV 命名空间:"
    echo "  wrangler kv:namespace create \"TODO_KV\""
    echo ""
    echo "然后将返回的 ID 填入 wrangler.toml"
    echo ""
    read -p "是否继续部署? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 构建项目
echo "📦 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo "✅ 构建成功"
echo ""

# 部署到 Cloudflare Pages
echo "🌐 部署到 Cloudflare Pages..."
wrangler pages deploy dist

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 部署成功!"
    echo ""
    echo "后续步骤:"
    echo "1. 访问 Cloudflare Dashboard 绑定 KV 命名空间"
    echo "2. 如果有现有数据，运行迁移脚本:"
    echo "   KV_NAMESPACE_ID=你的KV_ID node migrate-to-kv.js"
else
    echo "❌ 部署失败"
    exit 1
fi
